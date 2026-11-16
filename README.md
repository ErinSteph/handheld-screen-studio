# Handheld Screen Studio

A visual layout editor for Nintendo handheld screens, from
the original Game Boy to New Nintendo 3DS XL.

Create screen layouts, choose a handheld profile, add screens and elements, and
drag or resize them beside their JSON source. An additional static C adapter
can inspect supported GBA and DS drawing functions.

## Screenshots

Star Post is the original example layout included with the extension.

![Star Post layout and visual properties in VS Code](docs/screenshots/star-post.png)

The static C adapter previews drawing calls from a compatible DS project.
The pictured project and its assets are not included with the extension.

![Existing DS project inspected in VS Code](docs/screenshots/native-ds.png)

## Quick start

1. Open a workspace folder in VS Code.
2. Run **Handheld Screen Studio: Open Editor** from the Command Palette.
3. Choose **New handheld layout…** and select a device, or **Open layout…** to
   load an existing `.tm-screen.json` file. The `examples` directory contains
   original **Star Post** starter designs: a tiny fictional space-mail outpost.
   These are editable layout examples, not a playable game.
4. Use the screen dropdown to switch between detected views, including top and
   bottom displays. **Add screen…** creates another view in the selected file.
5. In a portable layout, choose **Add element…** for text, a rectangle, a border
   or a button. Drag on the canvas, resize using the lower-right handle, or use
   the property inspector. **Save source** saves the document.

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
any game's runtime code. A renderer/export adapter is needed to use a layout
in an actual game. Changing a profile changes the preview canvas; it does not
rescale elements or automatically optimise them for that hardware.

Game Boy layouts map colours to four shades in the preview. The other profiles
use an illustrative named palette. This is not a hardware-accurate emulator.

## Static C renderer adapter

For workspaces with `gba/src/presentation.h` or `ds/src/presentation.h`, the
editor discovers supported drawing functions automatically. It recognises the
`text`, `box`, `border`, `front`, `art`, `label`, `tiny`, `wrap` primitives and
their supported `d`-prefixed counterparts. This is an explicit adapter for that
simple C drawing convention, not a universal C/C++ scene parser.

- Literal integer positions can be dragged. Supported literal sizes, strings
  and named palette values can be edited without replacing surrounding code.
- Loops are collected once and all branches are included. Helper drawing is
  not expanded, runtime text uses placeholders, and dynamic coordinates remain
  locked. Native tiny-font preview is approximate.
- The adapter reads the original 5×7 font from `gba/src/font.h` and indexed
  artwork arrays from the selected port's `assets/cards.c`. Artwork is read
  locally and is not bundled with the extension.
- **Adding a C screen creates a function; navigation must be wired separately.**
  Moving DS drawing calls does not move input hitboxes.
- Verify the compiled game in an emulator. This extension does not compile,
  emulate or publish a game and does not directly edit arbitrary GB/3DS SDK
  renderers. Use portable layouts for those platforms.

## Privacy

The extension runtime contains no telemetry, account sign-in or network
requests. Bundled examples are original Star Post layouts; no existing game
project, ROM or artwork is bundled. README screenshots of an existing project
are documentation only. Source and layout edits are disabled
in untrusted workspaces. Only explicitly selected layout documents or the
supported local renderer files are edited.

Nintendo and the console names are trademarks of their respective owners.
This independent tool is not affiliated with or endorsed by Nintendo.
