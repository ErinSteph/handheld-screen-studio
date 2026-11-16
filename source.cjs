'use strict';
const detection=require('./detection.cjs');
// Offset-preserving C lexer: comments and strings never become executable code.
function lex(s) {
 const out=[]; const re=/(?:u8|u|U|L)?R"([^ ()\\\t\r\n]{0,16})\([\s\S]*?\)\1"|\s+|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"(?:\\.|[^"\\])*(?:"|$)|'(?:\\.|[^'\\])*'|[A-Za-z_]\w*|\d+|./gy; let m;
 while(re.lastIndex<s.length) {const at=re.lastIndex;m=re.exec(s);if(!m)break;if(/^(?:u8|u|U|L)?R"/.test(s.slice(at))&&!m[0].includes(")"))break;const t=m[0];if(/^\s|^\/\*|^\/\//.test(t))continue;out.push({text:t,start:m.index,end:re.lastIndex});}return out;
}
function close(tokens,i,open='(',end=')') {let depth=0;for(let j=i;j<tokens.length;j++){if(tokens[j].text===open)depth++;if(tokens[j].text===end&&!--depth)return j;}return -1;}
function functions(s) {
 const t=lex(s),out=[];let depth=0;
 for(let i=0;i<t.length;i++){
  if(/^[A-Za-z_]\w*$/.test(t[i].text)&&!['if','for','while','switch','catch'].includes(t[i].text)&&t[i+1]?.text==='('){const j=close(t,i+1);let body=j+1;while(j>=0&&['const','volatile','override','final','noexcept'].includes(t[body]?.text)){const qualifier=t[body++].text;if(qualifier==='noexcept'&&t[body]?.text==='('){const end=close(t,body);if(end<0)break;body=end+1;}}if(j>=0&&t[body]?.text==='{'){const k=close(t,body,'{','}');if(k<0)break;out.push({name:t[i].text,start:t[body].end,end:t[k].start,signatureStart:t[i].start,paramStart:t[i+1].end,paramEnd:t[j].start});i=k;continue;}}
  if(t[i].text==='{')depth++;if(t[i].text==='}')depth--;
 }return out;
}
const primitives=new Set(['box','border','panel','line','text','label','tiny','wrap','front','art','dbox','dborder','dline','dtext','dlabel','dtiny','dwrap','dfront','dart','dbutton',...Object.keys(detection.apis)]);
const literalNumber=s=>/^-?\d+$/.test(s.trim())?Number(s.trim()):null;
function literalString(s){if(!/^"(?:\\.|[^"\\])*(?:"|$)$/.test(s.trim()))return null;try{return JSON.parse(s.trim());}catch{return null;}}
function calls(s,fn,schemas=detection.apis){
 const t=lex(s.slice(fn.start,fn.end)).map(v=>({...v,start:v.start+fn.start,end:v.end+fn.start}));const out=[];
 for(let i=0;i<t.length;i++)if((primitives.has(t[i].text)||Object.hasOwn(schemas,t[i].text))&&t[i+1]?.text==='('){const end=close(t,i+1);if(end<0)continue;let start=i+2,depth=0;const args=[];
  function arg(a,b){if(a>=b)return;args.push({start:t[a].start,end:t[b-1].end,text:s.slice(t[a].start,t[b-1].end)});}
  for(let j=i+2;j<end;j++){const x=t[j].text;if(['(','[','{'].includes(x))depth++;if([')',']','}'].includes(x))depth--;if(x===','&&!depth){arg(start,j);start=j+1;}}arg(start,end);
  const api=schemas[t[i].text],arity=api?.arity??(api?1+Math.max(...Object.values(api).filter(v=>typeof v==='number')):null);
  if(args.length>=2&&(!api||(api.inferred?args.length===arity:api.configured?args.length>=arity:args.length===arity)))out.push({id:String(t[i].start),name:t[i].text,start:t[i].start,end:t[end].end,args,source:s.slice(t[i].start,t[end].end),line:s.slice(0,t[i].start).split('\n').length});i=end;
 }return out;
}
const names=['INK','WHITE','GOLD','PINK','ROSE','GREEN','CYAN','RED','MUTED','PURPLE','DARK','BLUE','CREAM','ORANGE','GREY','SHADOW'];
const colors=['#080510','#fff7e7','#ffce52','#f718a5','#ff7bb5','#5af78c','#63efff','#ff395a','#a5a5bd','#5a186b','#180829','#214a52','#f7e7c6','#ff9431','#5a5273','#000008'];
function describe(c,platform,schemas=detection.apis){
 const external=detection.describe(c,names,literalNumber,literalString,schemas);if(external)return external;
 const a=c.args.map(a=>a.text),nums=a.map(literalNumber),type=c.name.replace(/^d(?=box|border|line|text|label|tiny|wrap|front|art|button)/,'');
 const isText=['text','label','tiny','wrap'].includes(type),isImage=['front','art'].includes(type),isRect=['box','border','panel','button'].includes(type);
 const textIndex=isText?2:type==='button'?4:null;let w,h,scale=isText&&type!=='wrap'&&type!=='tiny'?(nums[4]??1):1;
 let text=textIndex===null?null:literalString(a[textIndex]??'');const dynamicText=textIndex!==null&&text===null;
 if(isRect){w=nums[2]??80;h=nums[3]??24;}
 else if(isImage){w=platform==='gba'&&type==='front'?70:nums[2]??70;h=platform==='gba'&&type==='front'?98:nums[3]??98;}
 else if(isText){w=type==='wrap'?(nums[3]??20)*6:Math.max(12,(text??'[dynamic]').length*(type==='tiny'?4:6)*scale);h=type==='wrap'?(nums[4]??2)*8:type==='tiny'?5:7*scale;}
 else{w=Math.abs((nums[2]??0)-(nums[0]??0))+1;h=Math.abs((nums[3]??0)-(nums[1]??0))+1;}
 const ci=isText?(type==='wrap'?6:3):type==='button'?null:4;
 return {...c,type,x:nums[0],y:nums[1],w,h,scale,text:dynamicText?'[dynamic]':text,dynamicText,textIndex,
 color:ci===null?'WHITE':names.includes(a[ci])?a[ci]:'MUTED',colorIndex:ci,editable:nums[0]!==null&&nums[1]!==null,
 widthIndex:(isRect||(isImage&&!(platform==='gba'&&type==='front')))?2:null,
 heightIndex:(isRect||(isImage&&!(platform==='gba'&&type==='front')))?3:null,
 card:isImage?(nums[platform==='gba'&&type==='front'?2:4]??0):null};
}
// Infer only single-call forwarding helpers, never arithmetic, branches or side effects.
function wrapperSchemas(s,configured={}){
 const base={...detection.apis,box:{type:'box',x:0,y:1,width:2,height:3,color:4},border:{type:'border',x:0,y:1,width:2,height:3,color:4},text:{type:'text',x:0,y:1,text:2,color:3,scale:4}};
 for(const [name,api]of Object.entries({...base}))if(['box','border','text'].includes(name))base['d'+name]=api;
 const schemas={...base,...configured},fns=functions(s),counts=new Map();for(const f of fns)counts.set(f.name,(counts.get(f.name)||0)+1);
 for(let pass=0;pass<4;pass++)for(const f of fns){
  if(Object.hasOwn(schemas,f.name)||counts.get(f.name)!==1||['__proto__','constructor','prototype'].includes(f.name))continue;
  const raw=s.slice(f.paramStart,f.paramEnd).trim();if(!raw||raw==='void'||/[()[\]=.]|\.\.\./.test(raw))continue;
  const params=raw.split(',').map(p=>p.match(/\b([A-Za-z_]\w*)\s*$/)?.[1]);if(params.some(p=>!p)||new Set(params).size!==params.length)continue;
  const found=calls(s,f,schemas);if(found.length!==1)continue;const c=found[0],api=schemas[c.name];if(!api||api.readOnly||api.type==='image')continue;
  const before=lex(s.slice(f.start,c.start)).map(t=>t.text).join(' '),after=lex(s.slice(c.end,f.end)).map(t=>t.text).join(' ');if(!['','return'].includes(before)||after!==';')continue;
  if((api.depth||0)>=4)continue;
  const derived={type:api.type,depth:(api.depth||0)+1,defaults:{...api.defaults},arity:params.length,inferred:true},used=new Set();let valid=true;
  for(const key of ['x','y','width','height','text','color','fontSize','scale'])if(api[key]!==undefined){const value=c.args[api[key]]?.text?.trim(),index=params.indexOf(value);if(index>=0){if(used.has(index)){valid=false;break;}used.add(index);derived[key]=index;delete derived.defaults[key];}else if(value!==undefined&&(literalNumber(value)!==null||literalString(value)!==null||/^[A-Za-z_]\w*$/.test(value))){derived.defaults[key]=value;}else{valid=false;break;}}
  if(valid&&(derived.x!==undefined||derived.y!==undefined)&&(derived.x!==undefined||derived.defaults.x!==undefined)&&(derived.y!==undefined||derived.defaults.y!==undefined)){derived.readOnly=derived.x===undefined||derived.y===undefined;schemas[f.name]=derived;}
 }
 // Preserve the native renderer's richer descriptions; only wrappers and explicit maps override it.
 return {...detection.apis,...configured,...Object.fromEntries(Object.entries(schemas).filter(([,v])=>v.inferred))};
}
function scenes(s,platform,configured={}){const schemas=wrapperSchemas(s,configured);const result=functions(s).map(f=>({...f,calls:calls(s,f,schemas)})).filter(f=>f.calls.length&& !['box','border','line','text','label','tiny','wrap','front','art','panel','dbox','dborder','dline','dtext','dlabel','dtiny','dwrap','dfront','dart','dbutton','dimage','card','dcard','pixel','dpixel','dcenter_label',...Object.keys(schemas)].includes(f.name)).map(f=>({...f,nodes:f.calls.map(c=>describe(c,platform,schemas)),procedural:/\b(for|if|while|switch)\s*\(/.test(s.slice(f.start,f.end))}));const counts=new Map();for(const f of result)counts.set(f.name,(counts.get(f.name)||0)+1);return result.map(f=>counts.get(f.name)>1?{...f,label:f.name+' · line '+s.slice(0,f.start).split('\n').length,name:f.name+'__at_'+f.start}:f);}
function edits(s,platform,sceneName,id,changes,configured={}){
 const scene=scenes(s,platform,configured).find(f=>f.name===sceneName),node=scene?.nodes.find(n=>n.id===id);if(!node||!node.editable)throw Error('This call is dynamic or no longer exists. Refresh the screen.');
 const changesOut=[];const map={x:node.xIndex??0,y:node.yIndex??1,width:node.widthIndex,height:node.heightIndex,color:node.colorIndex,text:node.textIndex};
 for(const [key,value]of Object.entries(changes)){
  const idx=map[key];if(idx===undefined||idx===null||!node.args[idx])throw Error('Unsupported property: '+key);let replacement;
  if(key==='text'){if(node.dynamicText||typeof value!=='string'||value.length>500||/[^\x20-\x7e\n]/.test(value))throw Error('Only existing ASCII string literals can be edited.');replacement=JSON.stringify(value);}
  else if(key==='color'){if(!names.includes(value)||!names.includes(node.args[idx].text))throw Error('Only literal palette names can be edited.');replacement=value;}
  else{if(literalNumber(node.args[idx].text)===null||!Number.isInteger(value)||Math.abs(value)>1024||(['width','height'].includes(key)&&value<1))throw Error('Only bounded literal integers can be edited.');replacement=String(value);}
  changesOut.push({start:node.args[idx].start,end:node.args[idx].end,text:replacement});
 }return changesOut.sort((a,b)=>b.start-a.start);
}
function newScreen(s,platform,title){
 if(!['gba','ds'].includes(platform)||typeof title!=='string'||!title.trim()||title.length>40||/[^\x20-\x7e]/.test(title))throw Error('Use a screen title of 1–40 printable ASCII characters.');
 const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'untitled';
 const prefix=platform==='ds'?'ds_studio_':'studio_';const existing=new Set(functions(s).map(f=>f.name));let name=prefix+slug,n=2;while(existing.has(name))name=prefix+slug+'_'+n++;
 const anchor=functions(s).find(f=>f.name===(platform==='ds'?'ds_render_scene':'render_scene'));if(!anchor)throw Error('Cannot find the renderer insertion point.');
 const start=s.lastIndexOf('\n',anchor.signatureStart)+1;
 const d=platform==='ds'?'d':'';const [w,h]=platform==='ds'?[256,192]:[240,160];
 const text=`/* Screen Studio: ${name}. Connect this function to navigation to show it in-game. */\nstatic void ${name}(void){\n ${d}box(0,0,${w},${h},INK);\n ${d}text(12,12,${JSON.stringify(title.trim())},GOLD,2);\n}\n\n`;
 return {name,start,end:start,text};
}
function cloneScreen(s,platform,sceneName,title,configured={}){
 if(typeof title!=='string'||!title.trim()||title.length>40||/[^\x20-\x7e]/.test(title))throw Error('Use a screen title of 1–40 printable ASCII characters.');
 const scene=scenes(s,platform,configured).find(f=>f.name===sceneName);if(!scene)throw Error('Choose an existing drawing function as the screen template.');
 const start=s.lastIndexOf('\n',scene.signatureStart)+1,prefix=s.slice(start,scene.signatureStart);
 if(!/^\s*(?:[A-Za-z_]\w*[\s*&]+)+$/.test(prefix))throw Error('Cannot safely copy this declaration. Use a simple function declaration on its own line; out-of-class qualified definitions need a matching declaration.');
 const oldName=s.slice(scene.signatureStart).match(/^[A-Za-z_]\w*/)[0],slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'new_screen',camel=title.split(/[^A-Za-z0-9]+/).filter(Boolean).map(v=>v[0].toUpperCase()+v.slice(1)).join('');
 const stem=/^(draw|render|show)_/.test(oldName)?oldName.match(/^(draw|render|show)_/)[0]+slug:/^(draw|render|show)[A-Z]/.test(oldName)?oldName.match(/^(draw|render|show)/)[0]+camel:oldName.endsWith('_screen')?slug+'_screen':'screen_'+slug;
 const existing=new Set(functions(s).map(f=>f.name));let name=stem,n=2;while(existing.has(name))name=stem+'_'+n++;
 let copy=s.slice(start,scene.end+1);const changes=[{start:scene.signatureStart-start,end:scene.signatureStart-start+oldName.length,text:name}];
 const label=scene.nodes.find(n=>n.textIndex!==null&&!n.dynamicText&&n.type!=='button');if(label){const arg=label.args[label.textIndex];changes.push({start:arg.start-start,end:arg.end-start,text:JSON.stringify(title.trim())});}
 for(const c of changes.sort((a,b)=>b.start-a.start))copy=copy.slice(0,c.start)+c.text+copy.slice(c.end);
 return {name,start:scene.end+1,end:scene.end+1,text:'\n\n'+copy+'\n'};
}

// Resolve only unique, directly initialized texture variables with literal paths.
function textures(s,scene){const t=lex(s),out={};for(let i=0;i<t.length-6;i++)if(['Texture','Texture2D'].includes(t[i].text)&&/^[A-Za-z_]\w*$/.test(t[i+1].text)&&t[i+2].text==='='&&t[i+3].text==='LoadTexture'&&t[i+4].text==='('&&t[i+6].text===')'&&t[i+7]?.text===';'){
 const name=t[i+1].text,file=literalString(t[i+5].text);if(!file||['__proto__','constructor','prototype'].includes(name))continue;
 const declarations=t.filter((v,j)=>v.text===name&&['Texture','Texture2D'].includes(t[j-1]?.text));if(declarations.length!==1)continue;
 const assignments=t.filter((v,j)=>v.text===name&&['=','+','-'].includes(t[j+1]?.text));if(assignments.length!==1)continue;
 const owner=functions(s).find(f=>t[i].start>=f.start&&t[i].start<f.end);if(owner&&(!scene||owner.start!==scene.start))continue;
 if(Object.hasOwn(out,name)){out[name]=null;continue;}out[name]={asset:file,at:t[i].start};
 }return out;}
function statement(s,node){const start=s.lastIndexOf('\n',node.start)+1,end=s.indexOf('\n',node.end),finish=end<0?s.length:end;const before=s.slice(start,node.start),after=s.slice(node.end,finish);if(!/^\s*$/.test(before)||!/^\s*;\s*$/.test(after))throw Error('Only a drawing call on its own line can be duplicated or deleted. Edit control flow and qualified calls in the source.');return {start,end:finish,text:s.slice(start,finish)};}
function nodeIndent(text){return text.match(/^\s*/)[0].length;}
function action(s,platform,sceneName,id,kind,configured={}){const scene=scenes(s,platform,configured).find(f=>f.name===sceneName),n=scene?.nodes.find(n=>n.id===id);if(!n)throw Error('Element no longer exists.');const line=statement(s,n);if(n.args.some(a=>literalNumber(a.text)===null&&literalString(a.text)===null&&!/^[A-Za-z_]\w*$/.test(a.text)))throw Error('Calls with complex argument expressions need source edits.');if(kind==='delete')return {start:line.start,end:line.end,text:''};if(kind!=='duplicate')throw Error('Unknown source action.');if(!n.editable)throw Error('Only positioned calls can be duplicated.');return {start:line.end,end:line.end,text:'\n'+line.text,id:String(line.end+1+(nodeIndent(line.text)))};}

module.exports={lex,functions,calls,scenes,edits,newScreen,describe,names,colors,literalNumber,wrapperSchemas,cloneScreen,textures,action,statement};
