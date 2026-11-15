const {test}=require('node:test'),assert=require('node:assert/strict'),layout=require('../layout.cjs');
test('all 17 Nintendo models produce valid editable screens with native logical sizes',()=>{
 assert.equal(layout.devices.length,17);
 for(const p of layout.devices){const data=layout.blank(p.id,'HANDHELD'),screens=layout.scenes(layout.parse(JSON.stringify(data)));assert.equal(screens.length,p.displays.length);for(const [i,s]of screens.entries()){assert.equal(s.width,p.displays[i].width);assert.equal(s.height,p.displays[i].height);assert.equal(s.nodes[1].text,'HANDHELD');assert.ok(s.nodes.every(n=>n.editable));}}
 assert.deepEqual(layout.profile('gb').displays,[{id:'main',width:160,height:144}]);assert.deepEqual(layout.profile('new3ds-xl').displays,[{id:'top',width:400,height:240},{id:'bottom',width:320,height:240}]);
});
test('screen creation, unique IDs, additions and drag/resize/text changes round trip',()=>{
 const original=layout.blank('new3ds-xl','MIRAN');let {data,id}=layout.addScreen(original,'Collection','bottom');assert.equal(original.screens.length,2);assert.equal(data.screens.length,3);assert.equal(layout.addScreen(data,'Collection','bottom').id,id+'-2');
 const added=layout.addElement(data,id,'button');data=layout.change(added.data,id,added.id,{x:28,y:90,width:180,height:30,text:'PLAY'});const screen=layout.scenes(layout.parse(JSON.stringify(data))).find(s=>s.name===id),n=screen.nodes.find(n=>n.id===added.id);assert.equal(n.x,28);assert.equal(n.w,180);assert.equal(n.text,'PLAY');assert.equal(n.type,'button');
});
test('GB preview has exactly four shades while GBC supports colour',()=>{assert.equal(new Set(layout.recolor(layout.blank('gb','A'))).size,4);assert.ok(new Set(layout.recolor(layout.blank('gbc','A'))).size>4);});
test('malformed layouts, unsupported properties and invalid native displays are rejected',()=>{
 const d=layout.blank('gba','A');assert.throws(()=>layout.parse('{oops'));assert.throws(()=>layout.blank('switch','A'));assert.throws(()=>layout.addScreen(d,'A','bottom'));assert.throws(()=>layout.change(d,'home-main','title',{x:1.5}));assert.throws(()=>layout.change(d,'home-main','title',{text:'\u2603'}));assert.throws(()=>layout.change(d,'home-main','title',{scale:0}));assert.throws(()=>layout.change(d,'home-main','title',{command:'execute'}));
 const duplicate=structuredClone(d);duplicate.screens[0].elements.push(duplicate.screens[0].elements[0]);assert.throws(()=>layout.validate(duplicate));
});
