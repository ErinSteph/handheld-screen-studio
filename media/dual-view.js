'use strict';
// Shared by the webview and tests; all pointer positions stay local to one display.
(function(root){
 function geometry(state){if(!state.dual?.enabled)return {width:state.dimensions.width,height:state.dimensions.height,views:[{x:0,y:0,...state.dimensions,scene:state.scene,active:true,display:state.display||'main'}]};const displays=state.dual.screens,width=Math.max(...displays.map(d=>d.width));let y=0;const views=displays.map(d=>{const active=d.id===state.dual.active,v={x:(width-d.width)/2,y,width:d.width,height:d.height,display:d.id,scene:active?state.scene:d.scene,active};y+=d.height+state.dual.gap;return v;});return {width,height:y-state.dual.gap,views};}
 function hit(geometry,p){return geometry.views.find(v=>p.x>=v.x&&p.x<v.x+v.width&&p.y>=v.y&&p.y<v.y+v.height)||null;}
 const api={geometry,hit};if(typeof module==='object'&&module.exports)module.exports=api;else root.HandheldDualView=api;
})(globalThis);
