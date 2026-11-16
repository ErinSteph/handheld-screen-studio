'use strict';
const fields=['x','y','width','height','text','color','fontSize','scale'];
function validate(data){
 if(!data||data.format!=='handheld-source-adapters'||data.version!==1||!data.functions||typeof data.functions!=='object'||Array.isArray(data.functions)||Object.keys(data.functions).length>32)throw Error('Expected a version 1 handheld-source-adapters file with up to 32 functions.');
 const result=Object.create(null);
 for(const [name,api]of Object.entries(data.functions)){
  if(!/^[A-Za-z_]\w*$/.test(name)||['__proto__','constructor','prototype'].includes(name))throw Error('Use a plain drawing function name.');
  if(!api||!['box','border','text'].includes(api.type))throw Error('Adapter type must be box, border or text.');
  const required=api.type==='text'?['x','y','text']:['x','y','width','height'];const used=new Set();
  const allowed=api.type==='text'?['x','y','text','color','fontSize','scale']:['x','y','width','height','color'];
  for(const key of Object.keys(api))if(!['type',...allowed].includes(key))throw Error('Unknown adapter property: '+key);
  for(const key of fields)if(api[key]!==undefined){if(!Number.isInteger(api[key])||api[key]<0||api[key]>15||used.has(api[key]))throw Error('Argument positions must be distinct integers from 0 to 15.');used.add(api[key]);}
  if(required.some(k=>api[k]===undefined)||api.fontSize!==undefined&&api.scale!==undefined)throw Error('Missing or conflicting argument positions.');
  result[name]={...api,configured:true};
 }return result;
}
function parse(text){if(Buffer.byteLength(text,'utf8')>32768)throw Error('Drawing adapter configuration is limited to 32 KiB.');let data;try{data=JSON.parse(text);}catch{throw Error('Invalid drawing adapter JSON.');}return validate(data);}
module.exports={parse,validate,fields};
