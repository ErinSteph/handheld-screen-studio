'use strict';
const api=acquireVsCodeApi(),$=id=>document.getElementById(id),canvas=$('screen'),ctx=canvas.getContext('2d');
let state=null,selected=null,drag=null,images={};
const post=m=>api.postMessage(m),el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
function color(n){const i=state.colorNames.indexOf(n);return state.colors[i<0?8:i];}
const symbols={' ': [0,0,0,0,0,0,0],'-':[0,0,0,14,0,0,0],'.':[0,0,0,0,0,0,4],':':[0,0,4,0,0,4,0],'!':[4,4,4,4,4,0,4],'?':[14,17,2,4,0,0,4],'/':[1,1,2,4,8,16,16],'>':[8,4,2,1,2,4,8],'<':[1,2,4,8,4,2,1],'+':[0,0,4,14,4,0,0],'[':[6,4,4,4,4,4,6],']':[12,4,4,4,4,4,12]};
function text(x,y,s,c,scale=1,tiny=false){let ox=x;ctx.fillStyle=c;for(const ch of String(s).toUpperCase()){if(ch==='\n'){x=ox;y+=8*scale;continue;}const rows=state.glyphs[ch]??symbols[ch]??symbols['?'];for(let r=0;r<7;r++)for(let col=0;col<5;col++)if(rows[r]&(16>>col))ctx.fillRect(x+col*scale,y+r*scale,scale,scale);x+=(tiny?4:6)*scale;}}
function border(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,1);ctx.fillRect(x,y+h-1,w,1);ctx.fillRect(x,y,1,h);ctx.fillRect(x+w-1,y,1,h);}
function draw(){if(!state)return;const {width,height}=state.dimensions;canvas.width=width;canvas.height=height;canvas.style.width=width*Number($('zoom').value)+'px';canvas.style.height=height*Number($('zoom').value)+'px';ctx.imageSmoothingEnabled=false;ctx.fillStyle=color('INK');ctx.fillRect(0,0,width,height);
 if(['title','ds_home_top','ds_battle_top'].includes(state.sceneName))for(let y=0;y<height;y++){const i=y<height/2?Math.floor(y/6):Math.floor((y-height/2)/6);ctx.fillStyle=y<height/2?`rgb(${156-i*4},${24+i},${125-i*3})`:`rgb(${22+i},${106-i*2},${71-i})`;ctx.fillRect(0,y,width,1);}
 for(const n of state.scene.nodes){if(n.x===null||n.y===null)continue;const {x,y,w,h}=n,c=color(n.color);if(n.type==='box'){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}else if(['border','panel','button'].includes(n.type)){if(n.type!=='border'){ctx.fillStyle=color('DARK');ctx.fillRect(x,y,w,h);}border(x,y,w,h,n.type==='panel'?color('PURPLE'):c);if(n.type==='button')text(x+Math.floor((w-(n.text??'').length*6+1)/2),y+Math.floor((h-7)/2),n.text??'',color('WHITE'));}
  else if(n.type==='line'){ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+.5,y+.5);ctx.lineTo(Number(n.args[2].text)+.5,Number(n.args[3].text)+.5);ctx.stroke();}
  else if(['front','art'].includes(n.type)){const image=images[(n.type==='art'?'art':'front')+':'+n.card];if(image?.complete)ctx.drawImage(image,x,y,w,h);if(n.type==='front')border(x-1,y-1,w+2,h+2,color('GOLD'));}
  else if(n.type==='wrap'){const cols=Number(n.args[3].text)||20,rows=Number(n.args[4].text)||2,words=String(n.text??'').split(/\s+/);let line='',row=0;for(const word of words){if(line.length&&line.length+word.length+1>cols){if(row<rows)text(x,y+row*8,line,c);row++;line=word;}else line+=(line?' ':'')+word;}if(row<rows)text(x,y+row*8,line,c);}
  else{if(n.type==='label')text(x+1,y+1,n.text??'',color('SHADOW'),n.scale);text(x,y,n.text??'',c,n.scale,n.type==='tiny');}
 }
 if($('grid').checked){ctx.strokeStyle='#ffffff24';ctx.lineWidth=.2;for(let x=0;x<width;x+=8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}for(let y=0;y<height;y+=8){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}}
 const n=state.scene.nodes.find(n=>n.id===selected);if(n?.editable){ctx.setLineDash([2,2]);ctx.strokeStyle='#63efff';ctx.strokeRect(n.x-.5,n.y-.5,n.w+1,n.h+1);ctx.setLineDash([]);if(n.widthIndex!==null&&n.heightIndex!==null){ctx.fillStyle='#63efff';ctx.fillRect(n.x+n.w-2,n.y+n.h-2,4,4);}}
}
function choose(id){selected=id;layers();inspector();draw();}
function layers(){const root=$('layers');root.replaceChildren();for(const n of state.scene.nodes){const b=el('button',`${n.editable?'':'🔒 '}${n.name} · ${n.dynamicText?n.args[n.textIndex].text:n.text??'shape'} · L${n.line}`);b.className=(n.id===selected?'selected ':'')+(!n.editable?'locked':'');b.title=n.source;b.onclick=()=>choose(n.id);root.append(b);}}
function edit(changes){const n=state.scene.nodes.find(n=>n.id===selected);if(!n)return;post({type:'edit',platform:state.platform,sceneName:state.sceneName,version:state.version,id:n.id,changes});}
function inspector(){const root=$('inspector');root.replaceChildren();const n=state.scene.nodes.find(n=>n.id===selected);$('code').textContent=n?.source??'Choose a drawing call.';$('reveal').disabled=!n;if(!n)return;
 if(!n.editable){root.append(el('p','Position uses C expressions. Edit these in the source; this prototype only moves literal coordinates.'));return;}
 const fields={};function field(name,value,type='number'){const label=el('label',name);const input=el('input');input.type=type;input.value=value;label.append(input);root.append(label);fields[name]=input;}
 field('x',n.x);field('y',n.y);
 if(n.widthIndex!==null&&/^-?\d+$/.test(n.args[n.widthIndex].text))field('width',n.w);
 if(n.heightIndex!==null&&/^-?\d+$/.test(n.args[n.heightIndex].text))field('height',n.h);
 if(n.textIndex!==null&&!n.dynamicText)field('text',n.text??'','text');
 if(state.portable&&n.type==='text')field('scale',n.scale);
 if(n.colorIndex!==null&&state.colorNames.includes(n.args[n.colorIndex]?.text)){const label=el('label','color'),select=el('select');for(const c of state.colorNames){const o=el('option',c);o.value=c;select.append(o);}select.value=n.color;label.append(select);root.append(label);fields.color=select;}
 const button=el('button',state.portable?'Apply to layout source':'Apply to C source');button.disabled=!state.trusted;button.onclick=()=>{const changes={};for(const [name,input]of Object.entries(fields)){const value=['text','color'].includes(name)?input.value:Number(input.value),old=name==='width'?n.w:name==='height'?n.h:n[name];if(value!==old)changes[name]=value;}if(Object.keys(changes).length)edit(changes);};root.append(button);
}
function point(e){const r=canvas.getBoundingClientRect();return {x:Math.round((e.clientX-r.left)*canvas.width/r.width),y:Math.round((e.clientY-r.top)*canvas.height/r.height)};}
canvas.onpointerdown=e=>{if(!state)return;const p=point(e);let n=state.scene.nodes.find(n=>n.id===selected);const resize=n?.editable&&n.widthIndex!==null&&n.heightIndex!==null&&Math.abs(p.x-n.x-n.w)<=4&&Math.abs(p.y-n.y-n.h)<=4;
 if(!resize)n=[...state.scene.nodes].reverse().find(n=>n.editable&&p.x>=n.x&&p.x<=n.x+n.w&&p.y>=n.y&&p.y<=n.y+n.h);if(!n)return;choose(n.id);drag={id:n.id,p,resize,start:{x:n.x,y:n.y,w:n.w,h:n.h}};canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(!drag)return;const n=state.scene.nodes.find(n=>n.id===drag.id),p=point(e);if(drag.resize){n.w=Math.max(1,drag.start.w+p.x-drag.p.x);n.h=Math.max(1,drag.start.h+p.y-drag.p.y);}else{n.x=drag.start.x+p.x-drag.p.x;n.y=drag.start.y+p.y-drag.p.y;}draw();};
canvas.onpointerup=()=>{if(!drag)return;const n=state.scene.nodes.find(n=>n.id===drag.id),changes=drag.resize?{width:n.w,height:n.h}:{x:n.x,y:n.y};if(Object.values(changes).some(v=>!Number.isInteger(v)||Math.abs(v)>1024)){post({type:'refresh'});}else edit(changes);drag=null;};
canvas.onpointercancel=()=>{drag=null;post({type:'refresh'});};
window.addEventListener('message',e=>{const m=e.data;if(m.type==='error'||m.type==='info'){$('error').textContent=m.message;return;}if(m.type==='empty'){state=null;$('status').textContent=m.message;return;}if(m.type!=='snapshot')return;state=m;drag=null;images={};$('error').textContent='';for(const [key,src]of Object.entries(m.images)){const image=new Image();image.onload=draw;image.src=src;images[key]=image;}
 $('platform').replaceChildren(...m.targets.map(t=>{const o=el('option',t.label);o.value=t.id;return o;}));$('platform').value=m.platform;
 $('scene').replaceChildren(...m.scenes.map(f=>{const name=f.label||f.name.replace(/^ds_/,'').replace(/^studio_/,'').replace(/_/g,' ');const o=el('option',name+' · '+f.count+' elements');o.value=f.name;return o;}));$('scene').value=m.sceneName;$('save').disabled=!m.trusted;$('add').disabled=!m.trusted;$('addElement').disabled=!m.trusted||!m.portable;
 $('hardwareLabel').hidden=!m.portable;if(m.portable){$('hardware').replaceChildren(...m.devices.map(d=>{const o=el('option',d.label);o.value=d.id;return o;}));$('hardware').value=m.hardware.id;}
 $('notice').textContent=m.portable?`Portable layout · ${m.hardware.label} · ${m.dimensions.width} × ${m.dimensions.height}. Editable design data; no ROM or native renderer is generated. Tile, palette-bank, VRAM and stereoscopic rendering limits are not validated.`:'C renderer study: direct drawing calls only. Loops are shown once; all branches are included. Runtime values use placeholders; helper drawing is not expanded. Verify the ROM in an emulator. DS touch hitboxes are not changed.';
 const visible=m.scene.nodes.filter(n=>n.editable).length;$('status').textContent=`${m.sceneName} · ${visible} positioned calls · source version ${m.version}`;$('file').textContent=m.file;
 if(!m.scene.nodes.some(n=>n.id===selected))selected=m.scene.nodes.find(n=>n.editable)?.id;layers();inspector();draw();});
$('platform').onchange=()=>post({type:'scene',platform:$('platform').value,sceneName:$('platform').value==='ds'?'ds_home_top':'title'});
$('scene').onchange=()=>{selected=null;post({type:'scene',platform:$('platform').value,sceneName:$('scene').value});};
$('refresh').onclick=()=>post({type:'refresh'});$('save').onclick=()=>post({type:'save'});$('zoom').onchange=draw;$('grid').onchange=draw;$('reveal').onclick=()=>post({type:'reveal',id:selected});post({type:'ready'});
$('add').onclick=()=>post({type:'add'});
$('newLayout').onclick=()=>post({type:'newLayout'});$('openLayout').onclick=()=>post({type:'openLayout'});$('addElement').onclick=()=>post({type:'addElement'});
$('hardware').onchange=()=>{if(state)post({type:'device',platform:state.platform,sceneName:state.sceneName,version:state.version,device:$('hardware').value});};
