'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
function array(source,name){const re=new RegExp('\\b'+name+'\\s*\\[[^;=]*=\\s*\\{([\\s\\S]*?)\\};');const m=re.exec(source);if(!m)throw Error('Missing asset array '+name);return (m[1].match(/\d+/g)||[]).map(Number);}
function crc(b){let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(name,data){const type=Buffer.from(name),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([n,type,data,c]);}
function png(indices,w,h,palette){const scan=Buffer.alloc(h*(1+w*3));for(let y=0;y<h;y++)for(let x=0;x<w;x++){const rgb=palette[indices[y*w+x]]??0,at=y*(1+w*3)+1+x*3;scan[at]=(rgb&31)*255/31;scan[at+1]=((rgb>>5)&31)*255/31;scan[at+2]=((rgb>>10)&31)*255/31;}const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);}
function load(root,platform){const source=fs.readFileSync(path.join(root,platform,'assets/cards.c'),'utf8'),palette=array(source,'tm_art_palette'),front=array(source,'tm_front'),art=array(source,'tm_art');
 const dims=platform==='gba'?{front:[70,98],art:[60,38]}:{front:[96,134],art:[80,50]};
 const font=fs.readFileSync(path.join(root,'gba/src/font.h'),'utf8'),letters=array(font,'letters'),numbers=array(font,'numbers');const glyphs={};for(let i=0;i<26;i++)glyphs[String.fromCharCode(65+i)]=letters.slice(i*7,i*7+7);for(let i=0;i<10;i++)glyphs[String(i)]=numbers.slice(i*7,i*7+7);
 return {glyphs,image(kind,index){const [w,h]=dims[kind];index=Math.max(0,Math.min(104,index));const raw=kind==='front'?front:art;return 'data:image/png;base64,'+png(raw.slice(index*w*h,(index+1)*w*h),w,h,palette).toString('base64');}};
}
module.exports={load,array,png};
