'use strict';
const layout=require('./layout.cjs'),source=require('./source.cjs'),font=require('./media/font.json');
const cstr=s=>'"'+Array.from(Buffer.from(String(s),'utf8'),b=>b===34?'\\"':b===92?'\\\\':b>=32&&b<=126?String.fromCharCode(b):'\\'+b.toString(8).padStart(3,'0')).join('')+'"';
const ident=s=>'hss_'+String(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,48);
function scenes(data){layout.validate(data);return data.screens.map((s,i)=>({...s,fn:ident(s.id)+'_'+i,...layout.profile(data.device).displays.find(d=>d.id===s.display)}));}
function comment(s){return String(s).replace(/[^\x20-\x7e]/g,'?').replace(/\*\//g,'* /');}
function commands(s,prefix,nativeMode=false,imageIds={}){const out=[];for(const e of s.elements){out.push('    /* '+comment(e.id)+' */');const x=e.x,y=e.y,c=nativeMode?e.color:'HSS_'+e.color;
 if(e.type==='image')out.push(`    hss_image(${x}, ${y}, ${e.width}, ${e.height}, hss_asset_${imageIds[e.asset].id}, ${imageIds[e.asset].width}, ${imageIds[e.asset].height});`);
 else if(e.type==='text')out.push(`    ${prefix}text(${x}, ${y}, ${cstr(e.text)}, ${c}, ${e.scale});`);
 else if(e.type==='button'){out.push(`    ${prefix}box(${x}, ${y}, ${e.width}, ${e.height}, ${nativeMode?'DARK':'HSS_DARK'});`,`    ${prefix}border(${x}, ${y}, ${e.width}, ${e.height}, ${c});`);const lines=e.text.split('\n');lines.forEach((line,i)=>out.push(`    ${prefix}text(${x+Math.floor((e.width-line.length*6+1)/2)}, ${y+Math.floor((e.height-7)/2)+i*8}, ${cstr(line)}, ${nativeMode?'WHITE':'HSS_WHITE'}, 1);`));}
 else out.push(`    ${prefix}${e.type}(${x}, ${y}, ${e.width}, ${e.height}, ${c});`);
 }return out.join('\n');}
function native(data,platform,host){const p=layout.profile(data.device);if(!['gba','ds'].includes(platform)||p.family!==platform&&!(platform==='ds'&&p.family==='dsi'))throw Error('Layout dimensions must match the selected GBA or DS renderer.');
 if(data.screens.some(s=>s.elements.some(e=>e.type==='image')))throw Error('Images need a project-specific texture loader in this renderer. Use standalone C export for embedded image pixels.');
 const prefix=platform==='ds'?'d':'',required=[prefix+'box',prefix+'border',prefix+'text'],functions=source.functions(host);for(const name of required){const f=functions.find(f=>f.name===name);if(!f||source.lex(host.slice(f.signatureStart,f.start)).filter(t=>t.text===',').length!==4)throw Error('The existing renderer needs a five-argument '+name+'() function.');}
 if(data.screens.some(s=>s.elements.some(e=>e.type==='text'&&e.scale>2)))throw Error('The supported existing renderer only guarantees text scales 1 and 2. Use standalone C for larger scales.');
 return `/* Handheld Screen Studio: existing ${platform.toUpperCase()} renderer functions.\n * Include after the host box/border/text functions and palette declarations.\n * Select the correct DS display before calling its screen function.\n * Navigation, input, build configuration and host drawing behavior stay in the game.\n * Review the host palette and font; this export does not replace them.\n */\n\n`+scenes(data).map(s=>`/* ${comment(s.name)} (${s.display}, ${s.width} x ${s.height}) */\nstatic void ${s.fn}(void)\n{\n    ${prefix}box(0, 0, ${s.width}, ${s.height}, INK);\n${commands(s,prefix,true)}\n}\n`).join('\n');}
function standalone(data,images={}){const imageIds=Object.create(null);for(const s of scenes(data))for(const e of s.elements)if(e.type==='image'&&!imageIds[e.asset]){const image=images[e.asset];if(!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||image.width>512||image.height>512||image.data?.length!==image.width*image.height*4)throw Error('Missing or invalid PNG pixels for '+e.asset);imageIds[e.asset]={...image,id:Object.keys(imageIds).length};}const all=scenes(data),palette=layout.recolor(data),symbols={' ':[0,0,0,0,0,0,0],'-':[0,0,0,14,0,0,0],'.':[0,0,0,0,0,0,4],':':[0,0,4,0,0,4,0],'!':[4,4,4,4,4,0,4],'?':[14,17,2,4,0,0,4],'/':[1,1,2,4,8,16,16],'>':[8,4,2,1,2,4,8],'<':[1,2,4,8,4,2,1],'+':[0,0,4,14,4,0,0],'[':[6,4,4,4,4,4,6],']':[12,4,4,4,4,4,12]};
 return `/* Handheld Screen Studio: standalone C99 software renderer.\n * Compile: cc -std=c99 -c layout.c\n * Host supplies a width*height uint32_t pixel buffer (0xRRGGBB) per display.\n * Call hss_render(index, pixels, width, height) for a screen listed below.\n * Copy/convert these pixels through the target SDK; no SDK or ROM build is generated.\n * No heap allocation, navigation, input, stereo rendering or hardware budget checks.\n * Pixel memory uses width*height*4 bytes; embedded targets may need an indexed/tiled backend.\n */\n#include <stdint.h>\n#include <stddef.h>\n\nenum HssColor { ${source.names.map(n=>'HSS_'+n).join(', ')} };\nstatic const uint32_t hss_palette[] = {\n    ${palette.map(v=>'0x'+v.slice(1)+'u').join(', ')}\n};\n\ntypedef struct { uint32_t *pixels; int width, height; } HssCanvas;\nstatic HssCanvas hss_canvas;\n\nvoid hss_box(int x, int y, int width, int height, unsigned color)\n{\n    for (int row = 0; row < height; ++row) {\n        int py = y + row;\n        if (py < 0 || py >= hss_canvas.height) continue;\n        for (int col = 0; col < width; ++col) {\n            int px = x + col;\n            if (px >= 0 && px < hss_canvas.width)\n                hss_canvas.pixels[(size_t)py * (size_t)hss_canvas.width + (size_t)px] = hss_palette[color];\n        }\n    }\n}\n\nvoid hss_border(int x, int y, int width, int height, unsigned color)\n{\n    hss_box(x, y, width, 1, color);\n    hss_box(x, y + height - 1, width, 1, color);\n    hss_box(x, y, 1, height, color);\n    hss_box(x + width - 1, y, 1, height, color);\n}\n\n/* The same 5x7 uppercase preview font; unsupported punctuation uses '?'. */\nstatic const uint8_t hss_font[95][7] = {\n${Array.from({length:95},(_,i)=>'    { '+(font[String.fromCharCode(i+32)]??symbols[String.fromCharCode(i+32)]??symbols['?']).join(', ')+' },').join('\n')}\n};\n\nvoid hss_text(int x, int y, const char *text, unsigned color, unsigned scale)\n{\n    int origin = x;\n    for (; *text; ++text) {\n        unsigned ch = (unsigned char)*text;\n        if (ch == '\\n') { x = origin; y += 8 * (int)scale; continue; }\n        if (ch >= 'a' && ch <= 'z') ch -= 'a' - 'A';\n        if (ch < 32 || ch > 126) ch = '?';\n        for (int row = 0; row < 7; ++row)\n            for (int col = 0; col < 5; ++col)\n                if (hss_font[ch - 32][row] & (16u >> col))\n                    hss_box(x + col * (int)scale, y + row * (int)scale, (int)scale, (int)scale, color);\n        x += 6 * (int)scale;\n    }\n}\n\n`+imageSource(imageIds)+all.map(s=>`/* ${comment(s.name)} (${s.display}, ${s.width} x ${s.height}) */\nstatic void ${s.fn}(void)\n{\n${commands(s,'hss_',false,imageIds)}\n}\n`).join('\n')+`\n/* Screen indices, names and display sizes for application navigation. */\nconst size_t hss_screen_count = ${all.length};\nconst char *const hss_screen_names[] = { ${all.map(s=>cstr(s.name)).join(', ')} };\nconst char *const hss_screen_displays[] = { ${all.map(s=>cstr(s.display)).join(', ')} };\nconst int hss_screen_widths[] = { ${all.map(s=>s.width).join(', ')} };\nconst int hss_screen_heights[] = { ${all.map(s=>s.height).join(', ')} };\n\n/* Returns 0 for a bad index, null buffer or wrong dimensions, otherwise 1.\n * The caller guarantees the buffer holds width*height pixels. Not reentrant. */\nint hss_render(size_t screen, uint32_t *pixels, int width, int height)\n{\n    if (screen >= hss_screen_count || !pixels || width != hss_screen_widths[screen] || height != hss_screen_heights[screen]) return 0;\n    hss_canvas = (HssCanvas){ pixels, width, height };\n    hss_box(0, 0, width, height, HSS_INK);\n    switch (screen) {\n${all.map((s,i)=>`    case ${i}: ${s.fn}(); break;`).join('\n')}\n    }\n    return 1;\n}\n`;}
function imageSource(images){if(!Object.keys(images).length)return '';return Object.values(images).map(image=>`static const uint8_t hss_asset_${image.id}[] = {
${Array.from(image.data).map(v=>String(v)).join(', ')}
};
`).join('')+`
/* Nearest-neighbor RGBA image scaling; composite over the screen buffer. */
void hss_image(int x, int y, int width, int height, const uint8_t *rgba, int sw, int sh)
{
    for (int row = 0; row < height; ++row) {
        int py = y + row;
        if (py < 0 || py >= hss_canvas.height) continue;
        for (int col = 0; col < width; ++col) {
            int px = x + col;
            if (px < 0 || px >= hss_canvas.width) continue;
            size_t src = ((size_t)(row * sh / height) * (size_t)sw + (size_t)(col * sw / width)) * 4;
            size_t dst = (size_t)py * (size_t)hss_canvas.width + (size_t)px;
            unsigned a = rgba[src + 3], rgb = 0;
            for (int ch = 0; ch < 3; ++ch) {
                unsigned shift = (unsigned)(2 - ch) * 8, old = (hss_canvas.pixels[dst] >> shift) & 255u;
                rgb |= ((rgba[src + (size_t)ch] * a + old * (255u - a) + 127u) / 255u) << shift;
            }
            hss_canvas.pixels[dst] = rgb;
        }
    }
}
`;
}

module.exports={standalone,native};
