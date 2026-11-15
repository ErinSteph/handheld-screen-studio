'use strict';
// Offset-preserving C lexer: comments and strings never become executable code.
function lex(s) {
 const out=[]; const re=/\s+|\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_]\w*|\d+|./gy; let m;
 while((m=re.exec(s))) {const t=m[0];if(/^\s|^\/\*|^\/\//.test(t))continue;out.push({text:t,start:m.index,end:re.lastIndex});}return out;
}
function close(tokens,i,open='(',end=')') {let depth=0;for(let j=i;j<tokens.length;j++){if(tokens[j].text===open)depth++;if(tokens[j].text===end&&!--depth)return j;}return -1;}
function functions(s) {
 const t=lex(s),out=[];let depth=0;
 for(let i=0;i<t.length;i++){
  if(!depth&&/^[A-Za-z_]\w*$/.test(t[i].text)&&t[i+1]?.text==='('){const j=close(t,i+1);if(j>=0&&t[j+1]?.text==='{'){const k=close(t,j+1,'{','}');if(k<0)break;out.push({name:t[i].text,start:t[j+1].end,end:t[k].start,signatureStart:t[i].start});i=k;continue;}}
  if(t[i].text==='{')depth++;if(t[i].text==='}')depth--;
 }return out;
}
const primitives=new Set(['box','border','panel','line','text','label','tiny','wrap','front','art','dbox','dborder','dline','dtext','dlabel','dtiny','dwrap','dfront','dart','dbutton']);
const literalNumber=s=>/^-?\d+$/.test(s.trim())?Number(s.trim()):null;
function literalString(s){if(!/^"(?:\\.|[^"\\])*"$/.test(s.trim()))return null;try{return JSON.parse(s.trim());}catch{return null;}}
function calls(s,fn){
 const t=lex(s.slice(fn.start,fn.end)).map(v=>({...v,start:v.start+fn.start,end:v.end+fn.start}));const out=[];
 for(let i=0;i<t.length;i++)if(primitives.has(t[i].text)&&t[i+1]?.text==='('){const end=close(t,i+1);if(end<0)continue;let start=i+2,depth=0;const args=[];
  function arg(a,b){if(a>=b)return;args.push({start:t[a].start,end:t[b-1].end,text:s.slice(t[a].start,t[b-1].end)});}
  for(let j=i+2;j<end;j++){const x=t[j].text;if(['(','[','{'].includes(x))depth++;if([')',']','}'].includes(x))depth--;if(x===','&&!depth){arg(start,j);start=j+1;}}arg(start,end);
  if(args.length>=2)out.push({id:String(t[i].start),name:t[i].text,start:t[i].start,end:t[end].end,args,source:s.slice(t[i].start,t[end].end),line:s.slice(0,t[i].start).split('\n').length});i=end;
 }return out;
}
const names=['INK','WHITE','GOLD','PINK','ROSE','GREEN','CYAN','RED','MUTED','PURPLE','DARK','BLUE','CREAM','ORANGE','GREY','SHADOW'];
const colors=['#080510','#fff7e7','#ffce52','#f718a5','#ff7bb5','#5af78c','#63efff','#ff395a','#a5a5bd','#5a186b','#180829','#214a52','#f7e7c6','#ff9431','#5a5273','#000008'];
function describe(c,platform){
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
function scenes(s,platform){return functions(s).map(f=>({...f,calls:calls(s,f)})).filter(f=>f.calls.length&& !['box','border','line','text','label','tiny','wrap','front','art','panel','dbox','dborder','dline','dtext','dlabel','dtiny','dwrap','dfront','dart','dbutton','dimage','card','dcard','pixel','dpixel','dcenter_label'].includes(f.name)).map(f=>({...f,nodes:f.calls.map(c=>describe(c,platform)),procedural:/\b(for|if|while|switch)\s*\(/.test(s.slice(f.start,f.end))}));}
function edits(s,platform,sceneName,id,changes){
 const scene=scenes(s,platform).find(f=>f.name===sceneName),node=scene?.nodes.find(n=>n.id===id);if(!node||!node.editable)throw Error('This call is dynamic or no longer exists. Refresh the screen.');
 const changesOut=[];const map={x:0,y:1,width:node.widthIndex,height:node.heightIndex,color:node.colorIndex,text:node.textIndex};
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
module.exports={lex,functions,calls,scenes,edits,newScreen,describe,names,colors,literalNumber};
