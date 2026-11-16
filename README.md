# Handheld Screen Studio

A visual layout editor for Nintendo handheld screens, from
the original Game Boy to New Nintendo 3DS XL.

Create screen layouts, choose a handheld profile, add screens and elements, and
drag or resize them beside their source. Scan C/C++ drawing functions, edit
supported literal calls, and export portable layouts as readable C source.

## Screenshots

Star Post is the original example layout included with the extension.

![Star Post layout and visual properties in VS Code](docs/screenshots/star-post.png)

The static C adapter previews drawing calls from a compatible DS project.
The pictured project and its assets are not included with the extension.

![Existing DS project inspected in VS Code](docs/screenshots/native-ds.png)

## Quick start

1. Open a game project in VS Code and run **Handheld Screen Studio: Open Editor**.
2. Choose a detected source file and screen. Use **More… → Scan C/C++…** to
   scan again or select another drawing file.
3. Drag elements on the canvas or edit their properties, then **Save**. The
   preview fits the available width by default; Zoom and Grid are optional.
4. **New screen…** adds a blank view to a portable layout, or copies the
   selected source function as a starting point in the same source file.
5. **More…** contains project adaptation, portable layouts and source export.
   These actions stay out of the main screen-editing toolbar.

The `examples` directory contains the original **Star Post** layouts and a
raylib drawing example. They are screen-design examples, not a playable game.

All edits use VS Code's undo stack. The source pane stays editable, and the
preview follows valid source changes. Version checks refuse stale edits.

## Handheld profiles

| Family | Models | Logical layout size |
| --- | --- | --- |
| Game Boy | Original, Pocket, Light | 160 × 144, four-shade preview |
| Game Boy Color | Color | 160 × 144 |
| Game Boy Advance | Original, SP, Micro | 240 × 160 |
| Nintendo DS | Original, Lite | Top and bottom: 256 × 192 each |
| Nintendo DSi | DSi, DSi XL | Top and bottom: 256 × 192 each |
| Nintendo 3DS | 3DS/XL, 2DS, New 3DS/XL, New 2DS XL | Top: 400 × 240; bottom: 320 × 240 |

XL and hardware revisions share their family's logical layout resolution.
The 3DS preview represents one 2D eye view; it does not simulate stereoscopic
depth. These are **screen-design profiles**, not ROM export targets. Tile,
sprite, palette-bank, VRAM and other hardware budgets are not validated.

Screen dimensions follow [Pan Docs](https://gbdev.io/pandocs/),
[GBATEK](https://mgba-emu.github.io/gbatek/), and
[Nintendo's 3DS specifications](https://www.nintendo.co.jp/event/conference2010/3ds/spec.pdf).

## Portable layout files

Portable `.tm-screen.json` files contain a device ID and named screens with
display assignments and drawing elements. They are intentionally separate from
any game's runtime code. Use **Export source…** to generate C drawing code. Target SDK integration
is still needed to use the result in an actual game. Changing a profile changes the preview canvas; it does not
rescale elements or automatically optimise them for that hardware.

Game Boy layouts map colours to four shades in the preview. The other profiles
use an illustrative named palette. This is not a hardware-accurate emulator.

## Elements and images

**Add element…** offers text, rectangles, borders, buttons and PNG images in a
portable layout. Import copies the PNG into an adjacent `.assets` folder using
a content-based filename. Keep that folder with the layout when moving or
sharing it. Images support transparency, dragging and resizing. PNGs are limited
to 512 × 512 pixels and 4 MiB each, with at most 32 images and 1,048,576 combined
image pixels per layout. Paths stay local to the layout folder.

The properties panel includes **Duplicate**, **Delete**, **Center X/Y**, and,
for layouts, **Bring forward / Send backward**. Later elements draw on top.
These changes are undoable through VS Code.

In C/C++ source, **Add element…** reuses a positioned drawing call from the
selected screen as a template. Duplicate and delete require a standalone call
on its own line; control flow and complex expressions need source edits.
Source images support raylib `DrawTexture(texture, x, y, tint)` with an
unambiguous `Texture2D`/`Texture` initializer using `LoadTexture("path.png")`
in the same file. PNG paths are resolved relative to the workspace folder;
texture size is previewed and literal positions can be moved. Tint is not
simulated. Reusing a texture call preserves its loading code; importing a new
texture into arbitrary source still needs the project's resource-loading setup.

Images retain their original colors, including on Game Boy profiles; image
palette conversion and console texture budgets are not validated.

## Export source

Open a portable layout and select **More… → Export source…**. All screens in the layout
are written to a new source file; existing files are never overwritten.

- **Standalone C99 renderer:** complete drawing code, named screen functions,
  palette, preview font, screen metadata and an `hss_render()` entry point.
  Supply a `uint32_t` pixel buffer with the screen's exact dimensions. The
  result uses `0xRRGGBB` pixels and compiles without a graphics library. Connect
  the buffer to the target SDK's display or replace the drawing backend.
- **Existing GBA/DS renderer functions:** offered when the workspace contains a
  matching supported renderer and the layout uses that device family. The
  exporter checks for five-argument box, border and text functions and emits
  calls to them. Include the result after those functions and the palette.
  Host fonts and colors may differ; text scales above two are rejected.
  Image layouts use standalone export because this adapter has no texture loader.

Standalone export embeds image pixels and draws scaled RGBA images over the
screen buffer; no external image library is required by the exported C.

Both exports preserve named screens, drawing order, literal positions, text
and supported shapes. Buttons export their visuals; navigation, input hitboxes,
display selection and build setup remain part of the game. Standalone C is a
software renderer, not a console ROM or complete SDK application. Its pixel
buffer uses four bytes per pixel, so small devices may need a tiled or indexed
backend. No stereo or hardware resource budgeting is generated.

## C/C++ source discovery

**More… → Scan C/C++…** searches up to 200 source/header files, at most 512 KiB per file
and 16 MiB total. Common build, dependency and version-control directories are
excluded. The scan is static: it never runs game code, evaluates expressions or
invokes a compiler. C++ namespaces, simple class methods and duplicate function
names are supported; this is not a complete C++ parser.

| Drawing convention | Recognised calls |
| --- | --- |
| Simple GBA/DS C renderer | `box`, `border`, `text`, `label` and the supported primitives below |
| [raylib](https://github.com/raysan5/raylib/blob/master/src/raylib.h) | `DrawRectangle`, `DrawRectangleLines`, `DrawText`, `DrawLine`, `DrawTexture` |
| [sf2d](https://github.com/xerpi/sf2dlib/blob/master/libsf2d/include/sf2d.h) | `sf2d_draw_rectangle`, `sf2d_draw_line` |
| [Citro2D](https://github.com/devkitPro/citro2d/blob/master/include/c2d/base.h) | `C2D_DrawRectSolid` |
| [DS gl2d](https://github.com/devkitPro/libnds/blob/master/include/gl2d.h) | `glBoxFilled`, `glBox` |

Choose the preview device and display manually for scanned sources. Fonts,
colors and depth are approximate; the scan does not infer the game's render
state. Endpoint-based calls remain read-only. Literal arguments can be edited
where their meaning is known. Dynamic positions and runtime text remain locked.
Loops appear once, all branches are included, complex helper calls are not expanded,
and unknown APIs or complex structures are omitted. In particular, tilemaps,
other sprite APIs, arbitrary SDL rectangles and structured Citro2D text are not imported.
Detected source is edited directly; it is not automatically converted to JSON.

### Adapting project drawing functions

Simple local forwarding helpers are recognised automatically, including chains
of up to four helpers and reordered arguments. For example, a `caption(x, y,
text)` function that only forwards to `DrawText(text, x, y, 14, WHITE)` can be
edited through calls to `caption()`. The helper body stays unchanged. Arithmetic,
branches, side effects, reused arguments and ambiguous definitions prevent
inference. Helpers with a fixed axis can be previewed but remain read-only.

For an unfamiliar drawing API, choose **More… → Adapt drawing function…**.
Select what the function draws and map its zero-based argument positions.
This saves `.handheld-screen-studio.json` in that workspace folder. Project
mappings take precedence over built-in argument maps in that folder. The mapping
is editor configuration, not a format the game must read. It can also be edited
directly and saved:

```json
{
  "format": "handheld-source-adapters",
  "version": 1,
  "functions": {
    "paint_label": { "type": "text", "x": 0, "y": 1, "text": 2, "color": 3 },
    "paint_panel": { "type": "box", "x": 0, "y": 1, "width": 2, "height": 3, "color": 4 }
  }
}
```

Maps support text, filled rectangles and borders. Optional `scale` or `fontSize`
positions describe text sizing. The editor does not infer what an arbitrary
function means: a project mapping explicitly supplies that meaning. Complex
structures, transforms and game state still require source-side work.

### Creating screens in existing source

In a scanned source file, **New screen…** uses the selected drawing function as
a template. It keeps the function signature, scope, local variables and body,
creates a unique name in the same style, and changes the first literal text
label to the new title when available. The original function is untouched;
the insertion is undoable. Review inherited drawing/game logic before connecting
the new function to navigation. Declarations that cannot be copied safely are
rejected, including out-of-class qualified C++ definitions without a matching
new declaration. The editor does not add navigation or input behavior.

## Native GBA/DS renderer adapter

For workspaces with `gba/src/presentation.h` or `ds/src/presentation.h`, the
editor discovers supported drawing functions automatically. It recognises the
`text`, `box`, `border`, `front`, `art`, `label`, `tiny`, `wrap` primitives and
their supported `d`-prefixed counterparts. This is an explicit adapter for that
simple C drawing convention, not a universal C/C++ scene parser.

- Literal integer positions can be dragged. Supported literal sizes, strings
  and named palette values can be edited without replacing surrounding code.
- Loops are collected once and all branches are included. Complex helper drawing is
  not expanded, runtime text uses placeholders, and dynamic coordinates remain
  locked. Native tiny-font preview is approximate.
- The adapter reads the original 5×7 font from `gba/src/font.h` and indexed
  artwork arrays from the selected port's `assets/cards.c`. Artwork is read
  locally and is not bundled with the extension.
- **Adding a C screen creates a function; navigation must be wired separately.**
  Moving DS drawing calls does not move input hitboxes.
- Verify the compiled game in an emulator. This extension does not compile,
  emulate or publish a game. Broader source scanning supports only the explicit
  call conventions listed above.

## Privacy

The extension runtime contains no telemetry, account sign-in or network
requests. Bundled examples are original Star Post layouts; no existing game
project, ROM or artwork is bundled. README screenshots of an existing project
are documentation only. Source and layout edits are disabled
in untrusted workspaces. Edits affect selected layout/source documents, explicitly created exports and
workspace drawing maps. PNG import also copies selected images into the layout
asset folder. Referenced PNGs are read locally. Source scanning reads only the
bounded set of workspace files described above.

Nintendo and the console names are trademarks of their respective owners.
This independent tool is not affiliated with or endorsed by Nintendo.
