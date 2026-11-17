'use strict';
const roles=['top','bottom'];
function view(scenes,hardware,previous={},selectedName,portable=false,defaultDisplay='top'){
 const displays=hardware?.displays||[];if(displays.length!==2||!roles.every(r=>displays.some(d=>d.id===r)))return {supported:false,enabled:false};
 const eligible=role=>scenes.filter(s=>portable?s.display===role:!s.display||s.display===role),choices=Object.fromEntries(roles.map(role=>[role,eligible(role).map(s=>({name:s.name,label:s.label||s.name}))]));
 const selected=scenes.find(s=>s.name===selectedName),active=selected?.display||previous.active||defaultDisplay;
 const names={};for(const role of roles){const list=eligible(role),saved=list.find(s=>s.name===previous[role]);let fallback;
  if(portable&&selected){const index=eligible(selected.display).findIndex(s=>s.name===selected.name);fallback=list[index%Math.max(1,list.length)];}
  else if(!portable){const suffix=selected?.name.replace(/_(top|bottom)$/,'');fallback=list.find(s=>s.name===suffix+'_'+role)||list.find(s=>s.name.endsWith('_'+role));}
  names[role]=(role===active&&selected&&list.includes(selected)?selected:saved||fallback||(role!==active?list.find(s=>s.name!==selected?.name):null)||list[0])?.name||'';
 }
 return {supported:true,enabled:previous.enabled===true,active:roles.includes(active)?active:'top',gap:Number.isInteger(previous.gap)&&previous.gap>=0&&previous.gap<=32?previous.gap:4,choices,top:names.top,bottom:names.bottom,screens:displays.map(d=>({...d,scene:scenes.find(s=>s.name===names[d.id])||{name:'',nodes:[]}}))};
}
function change(current,message){const next={enabled:current.enabled,active:current.active,gap:current.gap,top:current.top,bottom:current.bottom};if(!current.supported)throw Error('This device has one display.');
 if(message.enabled!==undefined){if(typeof message.enabled!=='boolean')throw Error('Invalid dual-screen view setting.');next.enabled=message.enabled;}
 if(message.gap!==undefined){if(!Number.isInteger(message.gap)||message.gap<0||message.gap>32)throw Error('Use a preview gap from 0 to 32 pixels.');next.gap=message.gap;}
 for(const role of roles)if(message[role]!==undefined){if(typeof message[role]!=='string'||!current.choices[role].some(s=>s.name===message[role]))throw Error('Choose an existing '+role+' screen.');next[role]=message[role];}
 if(message.active!==undefined){if(!roles.includes(message.active)||!next[message.active])throw Error('Choose a screen for that display first.');next.active=message.active;}
 return next;
}
module.exports={view,change};
