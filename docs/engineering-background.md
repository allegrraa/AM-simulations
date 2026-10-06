# Original engineering symbol system

**Superseded:** this SVG implementation was removed at the user's request. Current behavior and verification are documented in `reference-artwork-behavior.md`.

## Live reference inspection — 2026-10-05

Inspected https://www.maximiliankaspar.com/?ref=siteinspire at 1512×982, including stationary observations, pointer travel, scrolling into the first project and navigation to About.

- Actual artwork: an oversized, irregular branching/sculptural form represented by tiny ASCII-like characters, with changing orientation/density. It is not a tiled set of icons. Its precise object identity is ambiguous; no claim that it represents engineering geometry.
- Position: fixed full-width embedded artwork, measured 1512×1129px, behind content at z-index −20. Neutral glyphs are visibly gray; wrapper opacity is 1, so glyph opacity cannot be inferred from wrapper opacity.
- Scale: roughly viewport-height, cropped at the edges, with large empty regions. Foreground type and opaque project media occlude it.
- Time: visibly evolves across idle observations without scrolling. Motion is continuous, not just an entrance fade.
- Scroll: remains behind the scrolling intro/project spread. No discrete project-triggered replacement was established in this sample.
- Route: same artwork family remains on About; navigation also briefly uses black column wipes. We do not copy that unrelated page transition.
- Pointer/hover: movement occurred after pointer travel, but also while idle. A causal pointer response could not be isolated. Do not claim a measured pointer-driven rotation.
- Timing: wrapper computed transition duration 0s. Exact embedded animation timing/easing was not exposed by rendered CSS. Our 700ms crossfade is an independent choice within the requested 400–900ms range, not a claimed reference measurement.
- No source implementation, ASCII artwork, fonts, image or video assets were copied.

## Independent implementation

`EngineeringBackground` is decorative SVG built from original paths and deterministic point samples. Six persistent layers cover landing and the five workflow stages. State changes crossfade opacity and transform over 700ms; active artwork drifts slowly over a 20-second alternate cycle. Landing combines CAD, sampling and a tetrahedral fragment. Workflow compositions reserve central space for the actual model.

Pointer response is an independent interpretation: at most 8px horizontal/6px vertical, ignored while a mouse button is held. Scroll lowers prominence by up to 78% and shifts artwork at most 24px. Metadata uses white backing. Layers are fixed, clipped, aria-hidden and pointer-events:none. No additional WebGL contexts or dependencies are created.

Results take only the existing assessment's review flag; decorative outlines are not stress fields, measured scans or simulation output. Neutral results remain neutral. No backend, STL, renderer, camera or solver logic changes.

Reduced motion disables drift, parallax and crossfade, leaving the active static composition visible. Event handlers clean up and use requestAnimationFrame only when pointer/scroll events occur; these updates do not set React state. Inactive animation layers are paused.

## Verification

- Live DOM during design → reality confirmed both layers partially visible (approximately .16/.18 opacity) and 0.7s transitions; six SVG layers remain mounted.
- Landing screenshot confirms original artwork alongside the existing 3D bracket, not replacing it. A transient new-tab WebGL failure cleared after closing the reference and reloading; background SVG requires no WebGL.
- Automated coverage checks all six stage states, stable geometry, decorative accessibility, attention gating, reduced-motion styling and click-through rules.
- Final production build/typecheck passed; 24 frontend tests passed. Backend health returned `ok`. No dependencies added; approximately 1.6KB additional gzip JavaScript and 0.6KB CSS over the previous build.
- Browser verified each workflow stage, comparison overlay, model orbit/reset and result-review accent. Current browser warning/error log empty. Scroll at 425px reduced background density to approximately 0.526; metadata backing remained opaque white.
- Narrow landing sample: 390px viewport and 390px document width, no horizontal overflow. Reduced-motion fallback was checked in code/tests, not by changing the Mac's accessibility settings.
- Visual comparison: retained large cropped forms, uninterrupted empty areas, slow movement and foreground occlusion. Unlike the reference's ASCII sculpture, AM/SIM uses sparse vector/point compositions and deliberately protects engineering metadata. Strengthened landing and design linework after the first visual review.
- Final screenshot: `/tmp/am-symbols-landing.png` (1512×982).
