# 0.2.2 — 16 November 2026

- Clarify the README, changelog and maintainer release guide.
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
- Original Star Post starter layouts, self-contained tests and dependency-locked VSIX
  packaging. No existing game project or artwork is bundled.
- Add editor screenshots to the README. The pictured DS project is not bundled.
- CI validation and a manually dispatched OIDC Marketplace publishing workflow.

# 0.1.0 — 15 November 2026

- Discover GBA/DS drawing functions and inspect their direct draw calls.
- Automatically list detected views by readable name and add new drawing
  functions through an undoable Add screen action.
- Preview native card artwork and 5×7 text beside source code.
- Drag literal positions, resize supported literal rectangles/images, and edit
  supported text and palette values through undoable source edits.
- Reject stale document edits and dynamic coordinate/string replacements.
- Prototype limits are visible in the editor and README.
