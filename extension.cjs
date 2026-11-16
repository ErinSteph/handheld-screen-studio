'use strict';
const vscode=require('vscode'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=require('./source.cjs'),assets=require('./assets.cjs'),layout=require('./layout.cjs'),exporter=require('./export.cjs'),adapters=require('./adapters.cjs'),imageAssets=require('./images.cjs');
let panel;
function activate(context){context.subscriptions.push(vscode.commands.registerCommand('handheldScreens.open',async()=>{
 if(panel){panel.reveal();return;}
 const folders=vscode.workspace.workspaceFolders;if(!folders?.length){vscode.window.showErrorMessage('Open a workspace folder first.');return;}
 const folder=folders.find(f=>fs.existsSync(path.join(f.uri.fsPath,'ds/src/presentation.h')))||folders[0],root=folder.uri.fsPath;
 const nativeTargets=['ds','gba'].filter(p=>fs.existsSync(path.join(root,p,'src/presentation.h')));
 const discovered=new Map();
 function adapterFile(uri){return path.join((uri?vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath:null)||root,'.handheld-screen-studio.json');}
 function configured(uri){const file=adapterFile(uri);if(!fs.existsSync(file))return {};if(fs.statSync(file).size>32768)throw Error('Drawing adapter configuration is limited to 32 KiB.');return adapters.parse(fs.readFileSync(file,'utf8'));}
 let focusId=null;
 let target=nativeTargets[0]||'layout',layoutDoc=null,sceneName=target==='ds'?'ds_home_top':'title',snapshot=null,refreshTimer;
 const active=vscode.window.activeTextEditor?.document;
 if(active?.uri.fsPath.endsWith('.tm-screen.json')){try{layout.parse(active.getText());layoutDoc=active;target='layout';sceneName='';}catch(e){vscode.window.showErrorMessage(e.message);return;}}
 const font=JSON.parse(fs.readFileSync(path.join(context.extensionPath,'media/font.json'),'utf8')),cache={};
 const document=()=>target==='layout'?Promise.resolve(layoutDoc):discovered.has(target)?vscode.workspace.openTextDocument(discovered.get(target).uri):vscode.workspace.openTextDocument(vscode.Uri.file(path.join(root,target,'src/presentation.h')));
 const initial=await document();if(initial)await vscode.window.showTextDocument(initial,vscode.ViewColumn.One);
 panel=vscode.window.createWebviewPanel('handheldScreenStudio','Handheld Screen Studio',vscode.ViewColumn.Two,{enableScripts:true,retainContextWhenHidden:true,localResourceRoots:[vscode.Uri.joinPath(context.extensionUri,'media')]});
 const current=panel,web=current.webview,nonce=crypto.randomBytes(18).toString('base64');
 const showSource=doc=>vscode.window.showTextDocument(doc,current.viewColumn===vscode.ViewColumn.One?vscode.ViewColumn.Two:vscode.ViewColumn.One);
 const uri=name=>web.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'media',name));
 web.html=fs.readFileSync(path.join(context.extensionPath,'media/index.html'),'utf8').replaceAll('{{CSP}}',web.cspSource).replaceAll('{{NONCE}}',nonce).replace('{{STYLE}}',uri('style.css').toString()).replace('{{SCRIPT}}',uri('studio.js').toString());
 function trusted(){if(!vscode.workspace.isTrusted)throw Error('Trust this workspace before editing source.');}
 function currentSnapshot(m,doc){if(!snapshot||m.version!==doc.version||m.platform!==target||m.sceneName!==sceneName)throw Error('The source changed. Preview refreshed; retry your edit.');}
 async function replaceLayout(doc,data){const text=doc.getText(),edit=new vscode.WorkspaceEdit();edit.replace(doc.uri,new vscode.Range(doc.positionAt(0),doc.positionAt(text.length)),JSON.stringify(layout.validate(data),null,2)+'\n');if(!await vscode.workspace.applyEdit(edit))throw Error('Could not update the layout.');}
 async function refresh(){try{
  const doc=await document(),targets=nativeTargets.map(id=>({id,label:id==='ds'?'DS · C renderer':'GBA · C renderer'}));for(const [id,t]of discovered)targets.push({id,label:'C/C++ · '+vscode.workspace.asRelativePath(t.uri)});if(layoutDoc)targets.push({id:'layout',label:'Layout · '+path.basename(layoutDoc.uri.fsPath)});
  if(!doc){await web.postMessage({type:'empty',message:'Choose More → Scan C/C++ or Adapt drawing function to open project screens, or create a portable layout.',targets});return;}
  const portable=target==='layout',generic=discovered.has(target),text=doc.getText(),data=portable?layout.parse(text):null,scenes=portable?layout.scenes(data):source.scenes(text,target,configured(doc.uri));
  if(!scenes.some(f=>f.name===sceneName))sceneName=scenes.find(s=>s.name===(target==='ds'?'ds_home_top':'title'))?.name||scenes[0]?.name;
  if(!scenes.length)throw Error('No drawable screens found.');
  const selected=scenes.find(f=>f.name===sceneName),images={};let glyphs=font;
  if(!portable&&!generic){cache[target]??=assets.load(root,target);const art=cache[target];glyphs=art.glyphs;for(const n of selected.nodes)if(n.card!==null){const kind=n.type==='art'?'art':'front';images[kind+':'+n.card]=art.image(kind,n.card);}}
  if(portable){const loaded=imageAssets.collect(data,path.dirname(doc.uri.fsPath));for(const [asset,image]of Object.entries(loaded))images['image:'+asset]=image.uri;for(const n of selected.nodes)if(n.type==='image')n.imageKey='image:'+n.asset;}
  if(generic){const bindings=source.textures(text,selected);for(const n of selected.nodes)if(n.type==='image'){const binding=bindings[n.imageBinding];if(!binding||binding.at>n.start){n.editable=false;n.imageError='No unambiguous texture initializer before this call.';continue;}try{const image=imageAssets.load(root,binding.asset);n.w=image.width;n.h=image.height;n.imageKey='texture:'+n.imageBinding;images[n.imageKey]=image.uri;}catch(e){n.imageError=e.message;}}}
  for(const n of selected.nodes)if(!portable){try{source.statement(text,n);n.canRemove=true;n.canDuplicate=n.editable;}catch{}}
  const hardware=portable?layout.profile(data.device):generic?layout.profile(discovered.get(target).device):null;
  snapshot={platform:target,sceneName,version:doc.version};await web.postMessage({type:'snapshot',focusId,...snapshot,trusted:vscode.workspace.isTrusted,file:doc.uri.fsPath,targets,portable,generic,display:generic?(discovered.get(target).display||hardware.displays[0].id):null,hardware,devices:layout.devices,dimensions:portable?{width:selected.width,height:selected.height}:generic?hardware.displays.find(d=>d.id===(discovered.get(target).display||hardware.displays[0].id)):target==='gba'?{width:240,height:160}:{width:256,height:192},scenes:scenes.map(f=>({name:f.name,label:f.label,count:f.nodes.length})),scene:selected,glyphs,images,colors:portable?layout.recolor(data):generic?layout.recolor({device:hardware.id}):source.colors,colorNames:source.names});focusId=null;
 }catch(e){await web.postMessage({type:'error',message:e.message});}}
 async function newLayout(){
  trusted();const device=await vscode.window.showQuickPick(layout.devices.map(p=>({label:p.label,description:p.displays.map(d=>`${d.id} ${d.width}×${d.height}`).join(' · '),id:p.id})),{title:'Choose a Nintendo handheld profile'});if(!device)return;
  const name=await vscode.window.showInputBox({title:'Name this layout',value:'Handheld',validateInput:v=>!v.trim()||v.length>40||/[^\x20-\x7e]/.test(v)?'Use 1–40 printable ASCII characters.':null});if(name===undefined)return;
  const uri=await vscode.window.showSaveDialog({title:'Save handheld screen layout',defaultUri:vscode.Uri.file(path.join(root,'handheld-'+device.id+'.tm-screen.json')),filters:{'Handheld screen layout':['json']}});if(!uri)return;
  if(!uri.fsPath.endsWith('.tm-screen.json'))throw Error('Use a filename ending in .tm-screen.json.');
  try{await vscode.workspace.fs.stat(uri);throw Error('File already exists. Choose a new layout filename.');}catch(e){if(e.code!=='FileNotFound')throw e;}
  const edit=new vscode.WorkspaceEdit();edit.createFile(uri,{overwrite:false});edit.insert(uri,new vscode.Position(0,0),JSON.stringify(layout.blank(device.id,name),null,2)+'\n');if(!await vscode.workspace.applyEdit(edit))throw Error('Could not create layout.');
  layoutDoc=await vscode.workspace.openTextDocument(uri);target='layout';sceneName='';await showSource(layoutDoc);await refresh();
 }
 async function scanSources(){
  const uris=await vscode.workspace.findFiles('**/*.{c,h,cc,hh,cpp,hpp,cxx,hxx}','**/{.git,node_modules,vendor,third_party,build,dist,out}/**',201);
  const choices=[];let total=0;
  for(const uri of uris.slice(0,200)){
   const stat=await vscode.workspace.fs.stat(uri);if(stat.size>512*1024||total+stat.size>16*1024*1024)continue;total+=stat.size;
   const text=Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');if(text.includes('\0'))continue;
   const screens=source.scenes(text,'ds',configured(uri));if(screens.length)choices.push({label:vscode.workspace.asRelativePath(uri),description:screens.length+' detected functions',uri});
  }
  if(!choices.length){vscode.window.showInformationMessage('No supported drawing calls found in the scanned C/C++ files (up to 200 files, 512 KiB each, 16 MiB total).');return;}
  const choice=await vscode.window.showQuickPick(choices,{title:'Choose C/C++ drawing source (bounded static scan; no code is executed)'});if(!choice)return;
  target='source:'+choice.uri.toString();discovered.set(target,{uri:choice.uri,device:'gba'});sceneName='';
  await showSource(await document());await refresh();
 }
 async function adaptDrawing(){
  trusted();const adapterPath=adapterFile(discovered.get(target)?.uri||layoutDoc?.uri);const name=await vscode.window.showInputBox({title:'Adapt a project drawing function',prompt:'Exact function name. This adds a data-only argument map; source code is not executed.',placeHolder:'paint_label',validateInput:v=>/^[A-Za-z_]\w*$/.test(v)?null:'Use a C/C++ function identifier.'});if(name===undefined)return;
  const option=await vscode.window.showQuickPick([{label:'Text (5×7 scale)',type:'text',size:'scale'},{label:'Text (font size in pixels)',type:'text',size:'fontSize'},{label:'Filled rectangle',type:'box'},{label:'Rectangle border',type:'border'}],{title:'What does this function draw?'});if(!option)return;
  const keys=option.type==='text'?['x','y','text','color',option.size]:['x','y','width','height','color'];
  const indices=await vscode.window.showInputBox({title:'Map argument positions',prompt:'Zero-based positions for '+keys.join(', ')+'. Leave trailing optional color/size positions empty if absent.',value:'0,1,2,3,4',validateInput:v=>/^\d+(?:\s*,\s*\d*){2,4}$/.test(v)?null:'Enter comma-separated zero-based positions.'});if(indices===undefined)return;
  const values=indices.split(',').map(v=>v.trim()),mapping={type:option.type};keys.forEach((key,i)=>{if(values[i])mapping[key]=Number(values[i]);});
  const uri=vscode.Uri.file(adapterPath);let doc,data;
  if(fs.existsSync(adapterPath)){doc=await vscode.workspace.openTextDocument(uri);adapters.parse(doc.getText());data=JSON.parse(doc.getText());}else data={format:'handheld-source-adapters',version:1,functions:{}};
  Object.defineProperty(data.functions,name,{value:mapping,enumerable:true,writable:true,configurable:true});adapters.validate(data);
  const text=JSON.stringify(data,null,2)+'\n',edit=new vscode.WorkspaceEdit();
  if(doc)edit.replace(uri,new vscode.Range(doc.positionAt(0),doc.positionAt(doc.getText().length)),text);else{edit.createFile(uri,{overwrite:false});edit.insert(uri,new vscode.Position(0,0),text);}
  if(!await vscode.workspace.applyEdit(edit))throw Error('Could not save drawing adapter configuration.');doc=await vscode.workspace.openTextDocument(uri);if(!await doc.save())throw Error('Drawing map is open but could not be saved.');await showSource((await document())||doc);await refresh();await web.postMessage({type:'info',message:'Project drawing map saved. Scan again if the source is not open yet.'});
 }
 async function exportSource(){
  trusted();if(target!=='layout'||!layoutDoc)throw Error('Open a portable layout before exporting source. Existing C/C++ files are edited in place, not converted to JSON.');
  const original=layoutDoc,version=original.version,data=layout.parse(original.getText());
  const options=[{label:'Standalone C99 renderer',description:'Complete software drawing source; connect the pixel buffer to a target SDK.',id:'standalone'}];
  for(const id of nativeTargets)if(layout.profile(data.device).family===id||id==='ds'&&layout.profile(data.device).family==='dsi')options.push({label:'Existing '+id.toUpperCase()+' renderer functions',description:'Uses the supported host drawing convention; navigation and display selection stay in the game.',id});
  const option=await vscode.window.showQuickPick(options,{title:'Export layout as C source'});if(!option)return;
  const text=option.id==='standalone'?exporter.standalone(data,imageAssets.collect(data,path.dirname(original.uri.fsPath))):exporter.native(data,option.id,fs.readFileSync(path.join(root,option.id,'src/presentation.h'),'utf8'));
  const uri=await vscode.window.showSaveDialog({title:'Export C source to a new file',defaultUri:vscode.Uri.file(path.join(root,'screen-layout'+(option.id==='standalone'?'.c':'.h'))),filters:{'C source':['c','h']}});if(!uri)return;
  if(original.version!==version)throw Error('The layout changed during export. Retry to export the current version.');
  if(!/\.(c|h)$/.test(uri.fsPath))throw Error('Choose a .c or .h filename.');
  const edit=new vscode.WorkspaceEdit();edit.createFile(uri,{overwrite:false});edit.insert(uri,new vscode.Position(0,0),text);
  if(!await vscode.workspace.applyEdit(edit))throw Error('Could not create source. Choose a new filename; existing files are never overwritten.');
  const doc=await vscode.workspace.openTextDocument(uri);if(!await doc.save())throw Error('Export is open but could not be saved. Save it from the source editor.');
  await showSource(doc);await web.postMessage({type:'info',message:'Exported all layout screens. Connect navigation, input and target display integration in your project.'});
 }
 const subscription=web.onDidReceiveMessage(async m=>{try{
  if(m.type==='ready'||m.type==='refresh'){if(m.type==='ready'&&!layoutDoc&&!nativeTargets.length)await scanSources();await refresh();return;}
  if(m.type==='adapt'){await adaptDrawing();return;}
  if(m.type==='scan'){await scanSources();return;}
  if(m.type==='export'){await exportSource();return;}
  if(m.type==='newLayout'){await newLayout();return;}
  if(m.type==='openLayout'){const choices=await vscode.window.showOpenDialog({title:'Open a .tm-screen.json layout',canSelectMany:false,filters:{'Screen layout':['json']}});if(!choices?.length)return;const doc=await vscode.workspace.openTextDocument(choices[0]);layout.parse(doc.getText());layoutDoc=doc;target='layout';sceneName='';await showSource(doc);await refresh();return;}
  if(m.type==='scene'){if(!nativeTargets.includes(m.platform)&&!discovered.has(m.platform)&&!(m.platform==='layout'&&layoutDoc))return;target=m.platform;sceneName=String(m.sceneName||'');await refresh();return;}
  const doc=await document();if(!doc)return;
  if(m.type==='display'){currentSnapshot(m,doc);if(!discovered.has(target))return;const entry=discovered.get(target);if(!layout.profile(entry.device).displays.some(d=>d.id===m.display))throw Error('Unknown display.');entry.display=m.display;await refresh();return;}
  if(m.type==='device'){
   currentSnapshot(m,doc);if(discovered.has(target)){layout.profile(m.device);discovered.get(target).device=m.device;discovered.get(target).display=layout.profile(m.device).displays[0].id;await refresh();return;}trusted();if(target!=='layout')return;const data=layout.parse(doc.getText()),p=layout.profile(m.device);data.device=p.id;
   for(const s of data.screens)if(!p.displays.some(d=>d.id===s.display))s.display=p.displays[0].id;
   await replaceLayout(doc,data);await refresh();return;
  }
  if(m.type==='add'){
   trusted();const originalTarget=target,originalScene=sceneName,version=doc.version;
   const name=await vscode.window.showInputBox({title:'Add a handheld screen',prompt:target==='layout'?'Adds a blank screen to this layout.':discovered.has(target)?'Uses the current drawing function as a template, keeping its signature and local logic.':'Creates a drawing function. Connect gameplay navigation separately.',placeHolder:'Collection overview',validateInput:v=>!v.trim()||v.length>40||/[^\x20-\x7e]/.test(v)?'Use 1–40 printable ASCII characters.':null});if(name===undefined)return;
   let display;if(target==='layout'){const data=layout.parse(doc.getText()),p=layout.profile(data.device);display=p.displays.length===1?p.displays[0].id:await vscode.window.showQuickPick(p.displays.map(d=>d.id),{title:'Choose the screen display'});if(!display)return;}
   if(target!==originalTarget||sceneName!==originalScene||doc.version!==version)throw Error('The source changed while naming the screen. Please retry.');
   if(target==='layout'){const result=layout.addScreen(layout.parse(doc.getText()),name,display);await replaceLayout(doc,result.data);sceneName=result.id;}
   else{const created=discovered.has(target)?source.cloneScreen(doc.getText(),target,sceneName,name,configured(doc.uri)):source.newScreen(doc.getText(),target,name),edit=new vscode.WorkspaceEdit();edit.insert(doc.uri,doc.positionAt(created.start),created.text);if(!await vscode.workspace.applyEdit(edit))throw Error('Could not create drawing function.');sceneName=created.name;const editor=await showSource(doc),range=new vscode.Range(doc.positionAt(created.start),doc.positionAt(created.start+created.text.length));editor.selection=new vscode.Selection(range.start,range.end);editor.revealRange(range);}
   await refresh();await web.postMessage({type:'info',message:target==='layout'?'Screen added. Save the layout when ready.':'Drawing function added. Connect it to gameplay navigation separately.'});return;
  }
  if(m.type==='elementAction'){
   trusted();currentSnapshot(m,doc);if(target==='layout'){const data=layout.parse(doc.getText()),updated=layout.action(data,sceneName,m.id,m.action);if(m.action==='duplicate'){const ids=new Set(data.screens.find(s=>s.id===sceneName).elements.map(e=>e.id));focusId=updated.screens.find(s=>s.id===sceneName).elements.find(e=>!ids.has(e.id))?.id;}await replaceLayout(doc,updated);}
   else{const e=source.action(doc.getText(),target,sceneName,m.id,m.action,configured(doc.uri)),edit=new vscode.WorkspaceEdit();edit.replace(doc.uri,new vscode.Range(doc.positionAt(e.start),doc.positionAt(e.end)),e.text);if(!await vscode.workspace.applyEdit(edit))throw Error('Could not update drawing call.');focusId=e.id||null;}await refresh();return;
  }
  if(m.type==='addElement'){
   trusted();const version=doc.version,originalScene=sceneName,originalTarget=target;
   if(target!=='layout'){const scene=source.scenes(doc.getText(),target,configured(doc.uri)).find(f=>f.name===sceneName);const choices=(scene?.nodes||[]).filter(n=>n.editable).flatMap(n=>{try{source.statement(doc.getText(),n);return [{label:n.name,description:n.text||n.imageBinding||n.source,id:n.id}];}catch{return [];}});if(!choices.length)throw Error('No standalone positioned drawing calls are available as templates.');const choice=await vscode.window.showQuickPick(choices,{title:'Add an element using an existing drawing call as a template'});if(!choice)return;if(doc.version!==version||sceneName!==originalScene||target!==originalTarget)throw Error('Source changed; please retry.');const e=source.action(doc.getText(),target,sceneName,choice.id,'duplicate',configured(doc.uri)),edit=new vscode.WorkspaceEdit();edit.insert(doc.uri,doc.positionAt(e.start),e.text);if(!await vscode.workspace.applyEdit(edit))throw Error('Could not add drawing call.');focusId=e.id||null;await refresh();return;}
   const type=await vscode.window.showQuickPick(layout.types,{title:'Add a screen element (images use local PNG files)'});if(!type)return;
   let input;if(type==='image'){const files=await vscode.window.showOpenDialog({title:'Import PNG image (up to 512×512, 4 MiB)',canSelectMany:false,filters:{'PNG image':['png']}});if(!files?.length)return;input=files[0].fsPath;}
   if(doc.version!==version||sceneName!==originalScene||target!==originalTarget)throw Error('Layout changed; please retry.');
   let result;if(type==='image'){const image=imageAssets.importFile(doc.uri.fsPath,input);result=layout.addImage(layout.parse(doc.getText()),sceneName,image.asset,image.width,image.height);}else result=layout.addElement(layout.parse(doc.getText()),sceneName,type);
   await replaceLayout(doc,result.data);focusId=result.id;await refresh();return;
  }
  if(m.type==='save'){trusted();await doc.save();return;}
  if(m.type==='reveal'){
   const node=target==='layout'?null:source.scenes(doc.getText(),target,configured(doc.uri)).find(f=>f.name===sceneName)?.nodes.find(n=>n.id===m.id);
   const column=current.viewColumn===vscode.ViewColumn.One?vscode.ViewColumn.Two:vscode.ViewColumn.One,editor=await vscode.window.showTextDocument(doc,column);
   if(node){const range=new vscode.Range(doc.positionAt(node.start),doc.positionAt(node.end));editor.selection=new vscode.Selection(range.start,range.end);editor.revealRange(range);}return;
  }
  if(m.type==='edit'){
   trusted();currentSnapshot(m,doc);
   if(target==='layout')await replaceLayout(doc,layout.change(layout.parse(doc.getText()),sceneName,m.id,m.changes||{}));
   else{const edits=source.edits(doc.getText(),target,sceneName,m.id,m.changes||{},configured(doc.uri)),edit=new vscode.WorkspaceEdit();for(const e of edits)edit.replace(doc.uri,new vscode.Range(doc.positionAt(e.start),doc.positionAt(e.end)),e.text);if(!await vscode.workspace.applyEdit(edit))throw Error('VS Code could not apply this edit.');}
   await refresh();
  }
 }catch(e){await refresh();await web.postMessage({type:'error',message:e.message});}});
 const listener=vscode.workspace.onDidChangeTextDocument(e=>{const uri=target==='layout'?layoutDoc?.uri.fsPath:discovered.has(target)?discovered.get(target).uri.fsPath:path.join(root,target,'src/presentation.h');if(e.document.uri.fsPath===uri||e.document.uri.fsPath===adapterFile(target==='layout'?layoutDoc?.uri:discovered.get(target)?.uri)){clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,120);}});
 current.onDidDispose(()=>{clearTimeout(refreshTimer);subscription.dispose();listener.dispose();panel=null;});
}));}
module.exports={activate,deactivate(){panel?.dispose();}};
