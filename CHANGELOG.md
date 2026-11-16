# 0.6.0 — 16 November 2026

- Start a new SDK project from an empty VS Code window, with an explicit
  zero-screen option and a visible New project action.
- Keep New screen usable in empty editors, discover workspace layouts, and
  open generated projects directly into the screen editor.
- Export and build zero-screen projects on every platform family.
- Regenerate managed drawing/navigation files when the project layout is saved,
  preserving game logic and build settings; stop if generated files were edited.

# 0.5.0 — 16 November 2026

- Add a separate More → Export runnable project action with startup, display
  output, input loop, page navigation, Makefile and VS Code build task.
- Generate GB/GBC projects for GBDK and GBA, DS/DSi and 3DS projects for devkitPro.
- Convert GB/GBC screens to banked tiles, enforce the 256-tile limit, and
  quantize GBC screens to four colors per screen.
- Preserve the original layout/PNG assets in exported projects; ARM targets
  include editable C drawing functions. SDKs and build execution remain external.

# 0.4.0 — 16 November 2026

- Keep screen editing primary: New screen and Save stay visible; adaptation,
  scanning, layouts and export move to More. Preview details are collapsible
  and the canvas fits the available width.
- Adapt simple local drawing helpers automatically, including reordered
  arguments and constant defaults, without changing helper implementations.
- Add project-local drawing API mappings for unfamiliar text/rectangle calls.
- Create new source screens from the selected function while preserving its
  signature, scope and local logic.

- Import local PNG images into portable layouts, edit their size and position,
  and embed RGBA pixels in standalone C exports.
- Add duplicate, delete, centering and portable layer-order controls; reuse
  existing drawing calls when adding source elements.
- Preview simple raylib texture bindings and move literal texture positions.

# 0.3.0 — 16 November 2026

- Export portable layouts as complete standalone C99 drawing code or compatible
  functions for an existing supported GBA/DS renderer.
- Scan workspace C/C++ source and headers for supported drawing calls, including
  raylib, sf2d, Citro2D rectangles and DS gl2d rectangles.
- Detect functions within C++ namespaces/classes and distinguish duplicate names.
- Choose the preview device/display for scanned sources. Dynamic and endpoint
  arguments remain locked; previews state their limits.

# 0.2.3 — 16 November 2026

- Simplify user documentation.

# 0.2.2 — 16 November 2026

- Clarify screen-layout documentation.
- Keep example layouts and test labels independent of external game projects.

# 0.2.1 — 15 November 2026

- Add a pixel handheld icon to the extension and Marketplace listing.

# 0.2.0 — 15 November 2026

- Introduce Handheld Screen Studio, a visual editor for handheld screen layouts.
- Portable JSON layouts with 17 hardware profiles spanning Game Boy, Color,
  Advance, DS/DSi and 3DS/New 3DS variants.
- Add named screens and text/rectangle/border/button elements; drag, resize,
  edit properties and switch physical displays.
- Four-shade Game Boy previews and independent 3DS top/bottom dimensions.
- Include original Star Post starter layouts.
- Add editor screenshots to the README. The pictured DS project is not bundled.

# 0.1.0 — 15 November 2026

- Discover GBA/DS drawing functions and inspect their direct draw calls.
- Automatically list detected views by readable name and add new drawing
  functions through an undoable Add screen action.
- Preview native card artwork and 5×7 text beside source code.
- Drag literal positions, resize supported literal rectangles/images, and edit
  supported text and palette values through undoable source edits.
- Reject stale document edits and dynamic coordinate/string replacements.
- Prototype limits are visible in the editor and README.
