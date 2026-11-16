const {test}=require('node:test'),assert=require('node:assert/strict'),source=require('../source.cjs');
test('discovers calls inside namespaces and class methods, disambiguating duplicate names',()=>{
 const s='namespace UI { class Menu { void draw() const noexcept { DrawRectangle(1,2,30,40,RED); } }; } namespace Other { void draw() { C2D_DrawRectSolid(5,6,0.5,7,8,GREEN); } }';const scenes=source.scenes(s,'ds');assert.equal(scenes.length,2);assert.notEqual(scenes[0].name,scenes[1].name);assert.equal(scenes[1].nodes[0].w,7);assert.equal(scenes[1].nodes[0].h,8);
});
test('raylib text edits affect mapped literal arguments without touching font size or surrounding source',()=>{
 const s='void render(){ DrawText("Hello", 12, 34, 20, WHITE); }';const f=source.scenes(s,'ds')[0],n=f.nodes[0];let next=s;for(const e of source.edits(s,'ds',f.name,n.id,{x:22,y:44,text:'New "text"'}))next=next.slice(0,e.start)+e.text+next.slice(e.end);assert.equal(next,'void render(){ DrawText("New \\"text\\"", 22, 44, 20, WHITE); }'.replaceAll('\\\\"','\\"'));
});
test('dynamic and endpoint calls stay locked; comments, strings and unknown APIs are ignored',()=>{
 const s='void render(){/* DrawRectangle(1,2,3,4,RED); */ log("DrawRectangle(1,2,3,4,RED)"); unknown_draw(1,2,3); glBoxFilled(2,3,10,12,WHITE); sf2d_draw_rectangle(x,3,4,5,RED); }';const f=source.scenes(s,'ds')[0];assert.equal(f.nodes.length,2);assert.equal(f.nodes[0].w,9);assert.equal(f.nodes[0].editable,false);assert.equal(f.nodes[1].editable,false);assert.throws(()=>source.edits(s,'ds',f.name,f.nodes[0].id,{x:9}));
});

test('API arity is checked and sf2d line color follows its width argument',()=>{
 const f=source.scenes('void draw(){DrawRectangle(1,2);sf2d_draw_line(1,2,3,4,2,RED);}', 'ds')[0];assert.equal(f.nodes.length,1);assert.equal(f.nodes[0].color,'RED');assert.equal(f.nodes[0].editable,false);
});

test('C++ raw strings and incomplete comments cannot introduce fake drawing calls',()=>{
 const raw='const char *s=R"tag(fake(){DrawText("FAKE",1,2,7,WHITE);})tag"; void real(){DrawRectangle(1,2,3,4,RED);}';assert.deepEqual(source.scenes(raw,'ds').map(f=>f.name),['real']);assert.equal(source.scenes('/* void fake(){ DrawRectangle(1,2,3,4,RED); }','ds').length,0);
});

test('an incomplete string cannot create fake function bodies',()=>{assert.equal(source.scenes('const char *s="unterminated void fake(){DrawRectangle(1,2,3,4,RED);}', 'ds').length,0);});
