// Self-contained original test input: no game code, ROMs or artwork required.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
module.exports=function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'handheld-screen-studio-test-'));
 process.on('exit',()=>fs.rmSync(root,{recursive:true,force:true}));
 const font=require('../media/font.json');
 for(const p of ['gba','ds']){
  fs.mkdirSync(path.join(root,p,'src'),{recursive:true});fs.mkdirSync(path.join(root,p,'assets'),{recursive:true});
  const prefix=p==='ds'?'d':'';
  const title=`static void ${p==='ds'?'ds_home_top':'title'}(void){${prefix}label(62,5,"HANDHELD",GOLD,2);${prefix}text(95,24,"SCREEN STUDIO",WHITE,1);${p==='ds'?'dfront(17,40,96,134,0)':'front(8,38,0)'};}\n`;
  fs.writeFileSync(path.join(root,p,'src/presentation.h'),title+(p==='ds'?'static void ds_home_bottom(void){for(unsigned i=0;i<5;i++){dbutton(10,7+i*33,236,28,labels[i],0,1);}dtext(12,140,"HELP",CYAN,1);}\n':'')+`static void ${p==='ds'?'ds_render_scene':'render_scene'}(void){}\n`);
  const fw=p==='gba'?70:96,fh=p==='gba'?98:134,aw=p==='gba'?60:80,ah=p==='gba'?38:50;
  fs.writeFileSync(path.join(root,p,'assets/cards.c'),`const uint16_t tm_art_palette[192]={${Array.from({length:192},(_,i)=>i%2?32767:0).join(',')}};\nconst uint8_t tm_front[${fw*fh}]={${Array.from({length:fw*fh},(_,i)=>i%2).join(',')}};\nconst uint8_t tm_art[${aw*ah}]={${Array(aw*ah).fill(1).join(',')}};\n`);
 }
 fs.writeFileSync(path.join(root,'gba/src/font.h'),`static const unsigned char letters[26][7]={${Array.from({length:26},(_,i)=>'{'+font[String.fromCharCode(65+i)].join(',')+'}').join(',')}};\nstatic const unsigned char numbers[10][7]={${Array.from({length:10},(_,i)=>'{'+font[String(i)].join(',')+'}').join(',')}};`);
 return root;
};
