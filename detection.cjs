'use strict';
// Explicit argument maps only: source text is never evaluated or compiled.
const apis={
 DrawTexture:{type:'image',image:0,x:1,y:2,color:3},
 DrawRectangle:{type:'box',x:0,y:1,width:2,height:3,color:4},
 DrawRectangleLines:{type:'border',x:0,y:1,width:2,height:3,color:4},
 DrawText:{type:'text',x:1,y:2,text:0,color:4,fontSize:3},
 sf2d_draw_rectangle:{type:'box',x:0,y:1,width:2,height:3,color:4},
 sf2d_draw_line:{type:'line',x:0,y:1,endX:2,endY:3,color:5,readOnly:true},
 C2D_DrawRectSolid:{type:'box',x:0,y:1,width:3,height:4,color:5},
 glBoxFilled:{type:'box',x:0,y:1,endX:2,endY:3,color:4,readOnly:true},
 glBox:{type:'border',x:0,y:1,endX:2,endY:3,color:4,readOnly:true},
 DrawLine:{type:'line',x:0,y:1,endX:2,endY:3,color:4,readOnly:true}
};
function describe(c,names,number,string,schemas=apis){const api=schemas[c.name];if(!api)return null;const a=c.args.map(a=>a.text),get=k=>api[k]===undefined?api.defaults?.[k]:a[api[k]],num=k=>get(k)===undefined?null:number(String(get(k))),x=num('x'),y=num('y'),endX=num('endX'),endY=num('endY'),isText=api.type==='text',text=isText?string(get('text')??''):null,scale=isText?api.fontSize!==undefined||api.defaults?.fontSize!==undefined?Math.max(1,Math.min(4,Math.round((num('fontSize')??7)/7))):num('scale')??1:1;
 const w=isText?Math.max(12,(text??'[dynamic]').length*6*scale):api.endX!==undefined&&x!==null&&endX!==null?endX-x+1:num('width')??80;
 const h=isText?7*scale:api.endY!==undefined&&y!==null&&endY!==null?endY-y+1:num('height')??24;
 const color=get('color'),mapped=names.includes(color)?color:color==='BLACK'?'INK':'MUTED';
 return {...c,type:api.type,x,y,w,h,scale,text:isText?text??'[dynamic]':null,dynamicText:isText&&text===null,textIndex:api.text??null,color:mapped,colorIndex:api.color??null,xIndex:api.x,yIndex:api.y,widthIndex:api.width??null,heightIndex:api.height??null,editable:x!==null&&y!==null&&api.x!==undefined&&api.y!==undefined&&!api.readOnly,card:null,imageBinding:api.image===undefined?null:a[api.image],endX,endY,externalApi:true,adapted:!!(api.inferred||api.configured),adapter:api.inferred?'local helper':api.configured?'project mapping':null};
}
module.exports={apis,describe};
