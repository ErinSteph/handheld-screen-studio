const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=require('../source.cjs'),assets=require('../assets.cjs');const root=require('./fixture.cjs')();
test('discovers real port screens and retains exact argument offsets',()=>{
 for(const [platform,name]of [['gba','title'],['ds','ds_home_top'],['ds','ds_home_bottom']]){const s=fs.readFileSync(path.join(root,platform,'src/presentation.h'),'utf8'),scene=source.scenes(s,platform).find(f=>f.name===name);assert.ok(scene,name);for(const n of scene.nodes)for(const a of n.args)assert.equal(s.slice(a.start,a.end),a.text);}
});
test('patches only selected literals and preserves comments, other calls and string commas',()=>{
 const s='/* text(9,9,"fake",WHITE,1); */\nstatic void title(void){text(3, 7,"A, B)",WHITE,1);text(5,9,"OTHER",CYAN,1);}';const scene=source.scenes(s,'gba')[0];assert.equal(scene.nodes.length,2);assert.equal(scene.nodes[0].text,'A, B)');let out=s;for(const e of source.edits(s,'gba','title',scene.nodes[0].id,{x:11,y:12,text:'New "quoted" text'}))out=out.slice(0,e.start)+e.text+out.slice(e.end);
 assert.equal(out,'/* text(9,9,"fake",WHITE,1); */\nstatic void title(void){text(11, 12,"New \\"quoted\\" text",WHITE,1);text(5,9,"OTHER",CYAN,1);}'.replaceAll('\\\\"','\\"'));
});
test('dynamic expressions cannot be replaced or executed by the editor',()=>{
 const s='static void title(void){text(3+i*6,7,buffer,WHITE,1);text(3,7,buffer,WHITE,1);}';const scene=source.scenes(s,'gba')[0];assert.equal(scene.nodes[0].editable,false);assert.throws(()=>source.edits(s,'gba','title',scene.nodes[0].id,{x:2}));assert.throws(()=>source.edits(s,'gba','title',scene.nodes[1].id,{text:'replace variable'}));assert.throws(()=>source.edits(s,'gba','title',scene.nodes[1].id,{x:'1;danger()'}));
});
test('source strings, comments and nested calls do not corrupt scene boundaries',()=>{
 const s='static void first(void){text(2,3,"} fake(void){",WHITE,1);/* } */if(ok){text(4,5,"B",CYAN,1);}}static void second(void){wrap(3,4,fn(a,b),20,2,0,WHITE);}';const scenes=source.scenes(s,'gba');assert.deepEqual(scenes.map(s=>s.name),['first','second']);assert.equal(scenes[1].nodes[0].args[2].text,'fn(a,b)');assert.equal(scenes[0].nodes.length,2);
});
test('card preview uses native indexed assets and original 5x7 font',()=>{
 for(const platform of ['gba','ds']){const a=assets.load(root,platform);assert.deepEqual(a.glyphs.A,[14,17,17,31,17,17,17]);const data=Buffer.from(a.image('front',0).split(',')[1],'base64');assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),platform==='gba'?70:96);}
});
test('real edit round trip can restore original bytes without touching source files',()=>{
 const s=fs.readFileSync(path.join(root,'ds/src/presentation.h'),'utf8'),scene=source.scenes(s,'ds').find(f=>f.name==='ds_home_top'),node=scene.nodes.find(n=>n.name==='dlabel');let next=s;for(const e of source.edits(s,'ds',scene.name,node.id,{x:66,y:8}))next=next.slice(0,e.start)+e.text+next.slice(e.end);const parsed=source.scenes(next,'ds').find(f=>f.name===scene.name).nodes.find(n=>n.name==='dlabel');assert.equal(parsed.x,66);assert.equal(parsed.y,8);for(const e of source.edits(next,'ds',scene.name,parsed.id,{x:node.x,y:node.y}))next=next.slice(0,e.start)+e.text+next.slice(e.end);assert.equal(next,s);
});
test('new screen is detected, editable and added before renderer without changing navigation',()=>{
 for(const platform of ['gba','ds']){const s=fs.readFileSync(path.join(root,platform,'src/presentation.h'),'utf8'),created=source.newScreen(s,platform,'Test "Screen"'),out=s.slice(0,created.start)+created.text+s.slice(created.end),scene=source.scenes(out,platform).find(f=>f.name===created.name);assert.ok(scene);assert.equal(scene.nodes.length,2);assert.equal(scene.nodes[1].text,'Test "Screen"');assert.equal(out.replace(created.text,''),s);assert.equal(source.newScreen(out,platform,'Test "Screen"').name,created.name+'_2');assert.throws(()=>source.newScreen(s,platform,'\n injection'));}
});
