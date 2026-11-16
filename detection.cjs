'use strict';
// Explicit argument maps only: source text is never evaluated or compiled.
const apis={
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
function describe(c,names,number,string){const api=apis[c.name];if(!api)return null;const a=c.args.map(a=>a.text),nums=a.map(number),x=nums[api.x],y=nums[api.y],endX=nums[api.endX],endY=nums[api.endY],isText=api.type==='text',text=isText?string(a[api.text]??''):null,scale=isText?Math.max(1,Math.min(4,Math.round((nums[api.fontSize]??7)/7))):1;
 const w=isText?Math.max(12,(text??'[dynamic]').length*6*scale):api.endX!==undefined&&x!==null&&endX!==null?endX-x+1:nums[api.width]??80;
 const h=isText?7*scale:api.endY!==undefined&&y!==null&&endY!==null?endY-y+1:nums[api.height]??24;
 return {...c,type:api.type,x,y,w,h,scale,text:isText?text??'[dynamic]':null,dynamicText:isText&&text===null,textIndex:api.text??null,color:names.includes(a[api.color])?a[api.color]:'MUTED',colorIndex:api.color??null,xIndex:api.x,yIndex:api.y,widthIndex:api.width??null,heightIndex:api.height??null,editable:x!==null&&y!==null&&!api.readOnly,card:null,endX,endY,externalApi:true};
}
module.exports={apis,describe};
