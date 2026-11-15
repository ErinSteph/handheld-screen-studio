'use strict';
const vscode=require('vscode'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=require('./source.cjs'),assets=require('./assets.cjs'),layout=require('./layout.cjs');
let panel;
function activate(context){context.subscriptions.push(vscode.commands.registerCommand('handheldScreens.open',async()=>{
 if(panel){panel.reveal();return;}
 const folders=vscode.workspace.workspaceFolders;if(!folders?.length){vscode.window.showErrorMessage('Open a workspace folder first.');return;}
 const folder=folders.find(f=>fs.existsSync(path.join(f.uri.fsPath,'ds/src/presentation.h')))||folders[0],root=folder.uri.fsPath;
 const nativeTargets=['ds','gba'].filter(p=>fs.existsSync(path.join(root,p,'src/presentation.h')));
 let target=nativeTargets[0]||'layout',layoutDoc=null,sceneName=target==='ds'?'ds_home_top':'title',snapshot=null,refreshTimer;
 const active=vscode.window.activeTextEditor?.document;
 if(active?.uri.fsPath.endsWith('.tm-screen.json')){try{layout.parse(active.getText());layoutDoc=active;target='layout';sceneName='';}catch(e){vscode.window.showErrorMessage(e.message);return;}}
 const font=JSON.parse(fs.readFileSync(path.join(context.extensionPath,'media/font.json'),'utf8')),cache={};
 const document=()=>target==='layout'?Promise.resolve(layoutDoc):vscode.workspace.openTextDocument(vscode.Uri.file(path.join(root,target,'src/presentation.h')));
 const initial=await document();if(initial)await vscode.window.showTextDocument(initial,vscode.ViewColumn.One);
 panel=vscode.window.createWebviewPanel('handheldScreenStudio','Handheld Screen Studio',vscode.ViewColumn.Beside,{enableScripts:true,retainContextWhenHidden:true,localResourceRoots:[vscode.Uri.joinPath(context.extensionUri,'media')]});
 const current=panel,web=current.webview,nonce=crypto.randomBytes(18).toString('base64');
 const uri=name=>web.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'media',name));
 web.html=fs.readFileSync(path.join(context.extensionPath,'media/index.html'),'utf8').replaceAll('{{CSP}}',web.cspSource).replaceAll('{{NONCE}}',nonce).replace('{{STYLE}}',uri('style.css').toString()).replace('{{SCRIPT}}',uri('studio.js').toString());
 function trusted(){if(!vscode.workspace.isTrusted)throw Error('Trust this workspace before editing source.');}
 function currentSnapshot(m,doc){if(!snapshot||m.version!==doc.version||m.platform!==target||m.sceneName!==sceneName)throw Error('The source changed. Preview refreshed; retry your edit.');}
 async function replaceLayout(doc,data){const text=doc.getText(),edit=new vscode.WorkspaceEdit();edit.replace(doc.uri,new vscode.Range(doc.positionAt(0),doc.positionAt(text.length)),JSON.stringify(layout.validate(data),null,2)+'\n');if(!await vscode.workspace.applyEdit(edit))throw Error('Could not update the layout.');}
 async function refresh(){try{
  const doc=await document(),targets=nativeTargets.map(id=>({id,label:id==='ds'?'DS · C renderer':'GBA · C renderer'}));if(layoutDoc)targets.push({id:'layout',label:'Layout · '+path.basename(layoutDoc.uri.fsPath)});
  if(!doc){await web.postMessage({type:'empty',message:'Create a layout for your handheld, or open a .tm-screen.json file.',targets});return;}
  const portable=target==='layout',text=doc.getText(),data=portable?layout.parse(text):null,scenes=portable?layout.scenes(data):source.scenes(text,target);
  if(!scenes.some(f=>f.name===sceneName))sceneName=scenes.find(s=>s.name===(target==='ds'?'ds_home_top':'title'))?.name||scenes[0]?.name;
  if(!scenes.length)throw Error('No drawable screens found.');
  const selected=scenes.find(f=>f.name===sceneName),images={};let glyphs=font;
  if(!portable){cache[target]??=assets.load(root,target);const art=cache[target];glyphs=art.glyphs;for(const n of selected.nodes)if(n.card!==null){const kind=n.type==='art'?'art':'front';images[kind+':'+n.card]=art.image(kind,n.card);}}
  const hardware=portable?layout.profile(data.device):null;
  snapshot={platform:target,sceneName,version:doc.version};await web.postMessage({type:'snapshot',...snapshot,trusted:vscode.workspace.isTrusted,file:doc.uri.fsPath,targets,portable,hardware,devices:layout.devices,dimensions:portable?{width:selected.width,height:selected.height}:target==='gba'?{width:240,height:160}:{width:256,height:192},scenes:scenes.map(f=>({name:f.name,label:f.label,count:f.nodes.length})),scene:selected,glyphs,images,colors:portable?layout.recolor(data):source.colors,colorNames:source.names});
 }catch(e){await web.postMessage({type:'error',message:e.message});}}
 async function newLayout(){
  trusted();const device=await vscode.window.showQuickPick(layout.devices.map(p=>({label:p.label,description:p.displays.map(d=>`${d.id} ${d.width}×${d.height}`).join(' · '),id:p.id})),{title:'Choose a Nintendo handheld profile'});if(!device)return;
  const name=await vscode.window.showInputBox({title:'Name this layout',value:'Handheld',validateInput:v=>!v.trim()||v.length>40||/[^\x20-\x7e]/.test(v)?'Use 1–40 printable ASCII characters.':null});if(name===undefined)return;
  const uri=await vscode.window.showSaveDialog({title:'Save handheld screen layout',defaultUri:vscode.Uri.file(path.join(root,'handheld-'+device.id+'.tm-screen.json')),filters:{'Handheld screen layout':['json']}});if(!uri)return;
  if(!uri.fsPath.endsWith('.tm-screen.json'))throw Error('Use a filename ending in .tm-screen.json.');
  try{await vscode.workspace.fs.stat(uri);throw Error('File already exists. Choose a new layout filename.');}catch(e){if(e.code!=='FileNotFound')throw e;}
  const edit=new vscode.WorkspaceEdit();edit.createFile(uri,{overwrite:false});edit.insert(uri,new vscode.Position(0,0),JSON.stringify(layout.blank(device.id,name),null,2)+'\n');if(!await vscode.workspace.applyEdit(edit))throw Error('Could not create layout.');
  layoutDoc=await vscode.workspace.openTextDocument(uri);target='layout';sceneName='';await vscode.window.showTextDocument(layoutDoc,vscode.ViewColumn.One);await refresh();
 }
 const subscription=web.onDidReceiveMessage(async m=>{try{
  if(m.type==='ready'||m.type==='refresh'){await refresh();return;}
  if(m.type==='newLayout'){await newLayout();return;}
  if(m.type==='openLayout'){const choices=await vscode.window.showOpenDialog({title:'Open a .tm-screen.json layout',canSelectMany:false,filters:{'Screen layout':['json']}});if(!choices?.length)return;const doc=await vscode.workspace.openTextDocument(choices[0]);layout.parse(doc.getText());layoutDoc=doc;target='layout';sceneName='';await vscode.window.showTextDocument(doc,vscode.ViewColumn.One);await refresh();return;}
  if(m.type==='scene'){if(!nativeTargets.includes(m.platform)&&!(m.platform==='layout'&&layoutDoc))return;target=m.platform;sceneName=String(m.sceneName||'');await refresh();return;}
  const doc=await document();if(!doc)return;
  if(m.type==='device'){
   trusted();currentSnapshot(m,doc);if(target!=='layout')return;const data=layout.parse(doc.getText()),p=layout.profile(m.device);data.device=p.id;
   for(const s of data.screens)if(!p.displays.some(d=>d.id===s.display))s.display=p.displays[0].id;
   await replaceLayout(doc,data);await refresh();return;
  }
  if(m.type==='add'){
   trusted();const originalTarget=target,version=doc.version;
   const name=await vscode.window.showInputBox({title:'Add a handheld screen',prompt:target==='layout'?'Adds an editable screen to the layout document.':'Creates a drawing function. Connect gameplay navigation separately.',placeHolder:'Collection overview',validateInput:v=>!v.trim()||v.length>40||/[^\x20-\x7e]/.test(v)?'Use 1–40 printable ASCII characters.':null});if(name===undefined)return;
   let display;if(target==='layout'){const data=layout.parse(doc.getText()),p=layout.profile(data.device);display=p.displays.length===1?p.displays[0].id:await vscode.window.showQuickPick(p.displays.map(d=>d.id),{title:'Choose the screen display'});if(!display)return;}
   if(target!==originalTarget||doc.version!==version)throw Error('The source changed while naming the screen. Please retry.');
   if(target==='layout'){const result=layout.addScreen(layout.parse(doc.getText()),name,display);await replaceLayout(doc,result.data);sceneName=result.id;}
   else{const created=source.newScreen(doc.getText(),target,name),edit=new vscode.WorkspaceEdit();edit.insert(doc.uri,doc.positionAt(created.start),created.text);if(!await vscode.workspace.applyEdit(edit))throw Error('Could not create drawing function.');sceneName=created.name;}
   await refresh();await web.postMessage({type:'info',message:target==='layout'?'Screen added. Save the layout when ready.':'Drawing function added. Connect it to gameplay navigation separately.'});return;
  }
  if(m.type==='addElement'){
   trusted();if(target!=='layout')return;const version=doc.version,originalScene=sceneName;
   const type=await vscode.window.showQuickPick(layout.types,{title:'Add a screen element'});if(!type)return;
   if(doc.version!==version||sceneName!==originalScene||target!=='layout')throw Error('Layout changed; please retry.');
   await replaceLayout(doc,layout.addElement(layout.parse(doc.getText()),sceneName,type).data);await refresh();return;
  }
  if(m.type==='save'){trusted();await doc.save();return;}
  if(m.type==='reveal'){
   const node=target==='layout'?null:source.scenes(doc.getText(),target).find(f=>f.name===sceneName)?.nodes.find(n=>n.id===m.id);
   const column=current.viewColumn===vscode.ViewColumn.One?vscode.ViewColumn.Two:vscode.ViewColumn.One,editor=await vscode.window.showTextDocument(doc,column);
   if(node){const range=new vscode.Range(doc.positionAt(node.start),doc.positionAt(node.end));editor.selection=new vscode.Selection(range.start,range.end);editor.revealRange(range);}return;
  }
  if(m.type==='edit'){
   trusted();currentSnapshot(m,doc);
   if(target==='layout')await replaceLayout(doc,layout.change(layout.parse(doc.getText()),sceneName,m.id,m.changes||{}));
   else{const edits=source.edits(doc.getText(),target,sceneName,m.id,m.changes||{}),edit=new vscode.WorkspaceEdit();for(const e of edits)edit.replace(doc.uri,new vscode.Range(doc.positionAt(e.start),doc.positionAt(e.end)),e.text);if(!await vscode.workspace.applyEdit(edit))throw Error('VS Code could not apply this edit.');}
   await refresh();
  }
 }catch(e){await refresh();await web.postMessage({type:'error',message:e.message});}});
 const listener=vscode.workspace.onDidChangeTextDocument(e=>{const uri=target==='layout'?layoutDoc?.uri.fsPath:path.join(root,target,'src/presentation.h');if(e.document.uri.fsPath===uri){clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,120);}});
 current.onDidDispose(()=>{clearTimeout(refreshTimer);subscription.dispose();listener.dispose();panel=null;});
}));}
module.exports={activate,deactivate(){panel?.dispose();}};
