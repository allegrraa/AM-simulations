# Reference artwork behavior — before replacement implementation

## Inspection completed 2026-10-05

Live reference: https://www.maximiliankaspar.com/?ref=siteinspire. Inspected in the connected browser, not downloaded source. Desktop 1512×982 and resized 760×982. Scrolled the entire homepage through 3 Linden, Cityparking, Razzo, AE Open Day and the footer (scrollY 9425); interacted with project headings, navigation, and blank-area pointer positions. Earlier route inspection also established the same artwork family on About. No reference source or artwork is reused.

1. **Artwork.** One dominant irregular sculptural silhouette rendered as tiny monospace characters. It has a narrow elongated spine and broad folded/branch-like lobes, sometimes edge-on and sometimes broad. This is a volumetric character-field rendering, not independent vector icons. Some projections appear to split into islands, but these belong to the same overall composition.
2. **Triggers.** Glyph content and apparent orientation change during idle observations. Pointer travel and project clicks were tested, but a distinct pointer- or hover-triggered artwork replacement was not established. Scrolling through all four projects did not reveal four distinct themed background states. Project headings toggle descriptions; opaque project imagery changes what parts of the background are exposed. Do not invent a hover-swap mechanism unsupported by observation.
3. **Positioning.** Fixed viewport layer: x=0, y≈−19.63, width1512, height1129.3 at 1512×982; the same y at the footer. Its wrapper z-index is −20. The embedded document contains a canvas and a visible DOM table of characters. The table is centered using an absolute parent transform; the DOM itself is not CSS-rotated.
4. **Scale.** Oversized: artwork envelope can extend beyond viewport top/bottom and sometimes horizontally. The character table measured1664×1243 on desktop; at760px the table measured837×1243. Glyph size stays constant while the field changes width/crops. Typical visible form spans roughly half to three-quarters of the desktop width, depending on orientation, and at least viewport height.
5. **Motion.** Apparent 3D rotation/deformation is represented by changing character coverage/shading, not sliding a flat SVG. Broad lobes become narrow bands and then reappear. No strong cursor-following translation or repeated scale pulse was observed. Stationary samples varied around2500–2800 nonblank glyphs; orientation evolves slowly over multi-second observations.
6. **Transitions.** Canvas/table computed CSS animation is `none`, no meaningful CSS transition duration and no rotating transform. The animation is rendered into the character field. Therefore exact internal angular speed/easing is not established from computed styles. No discrete fade between project symbols was observed. Route navigation has separate black column wipes; these are not the artwork mechanism and will not be copied.
7. **Typography.** Foreground text stays in its layout and overlaps the artwork. Background is visible between and behind letters; type does not dodge a collection of symbols. Opaque photography occludes it. The artwork continues under content, rather than being isolated into a hero-only decoration band.
8. **Density.** One coherent form at a time, many small characters within that form, extensive blank space outside it. Rendered character table: Courier New/monospace10px, line-height10px, letter-spacing−1px. Approximately124 line breaks in the oversized field. Distinguish thousands of shading glyphs from thousands of scattered particles.
9. **Color.** Sampled glyph color is rgb(173,173,173), opacity1. Monochrome gray on white; no project-driven accent-color changes observed across the full homepage. Foreground black type and color photographs are much stronger.
10. **Why it works.** A single oversized, changing silhouette supplies depth and continuity without adding a second navigation/diagram language. Fine, low-contrast character texture recedes behind crisp type and media. Cropping and changing orientation provide variation while stable centering and monochrome treatment keep the page calm.

## Replacement specification

Remove the entire `EngineeringBackground` SVG system, its stylesheet and associated tests. Replace with a separate `ReferenceArtworkLayer`: one original continuous folded surface, projected and shaded into a monospace character grid using a lightweight CPU/Canvas2D renderer. No Three.js/WebGL dependency and no access to uploaded meshes, solver data or camera state.

Recreate fixed centering, oversized crop, constant-size gray glyphs, slow rendered volumetric evolution, and foreground occlusion. Do not recreate the reference sculpture. Do not add cubes, axes, crosses, scan particles, rings, separate symbols, orange background colors, scroll fading or mouse parallax. Workflow may subtly change the single surface's fold parameter, interpolated continuously rather than replacing a collection of compositions. This is the explicit application adaptation, not a claim that the reference has workflow states.

Keep the landing specimen and all existing foreground layout. Use reduced-motion static rendering, pause while hidden, cap character-grid resolution and frame rate, clean up animation/listeners, and make the layer aria-hidden and pointer-events:none.

## Mandatory visual comparison rounds

Each round compares live desktop captures at1512×982, identifies five largest remaining differences, applies corrections and captures again. Original artwork intentionally differs; evaluate mechanism, density, scale, position, motion, layering and negative space.

### Round 1

Captures: `/tmp/am-artwork-reference-round1.png`, `/tmp/am-artwork-round1.png`. A preliminary app capture was at1280×720 and was discarded/replaced after explicitly verifying1512×982.

Five corrections: (1) widen the overly narrow original surface, (2) curve its depth so it is not a flat opaque-looking band, (3) redistribute shading toward lighter glyphs, (4) break the excessively regular shading/edge sampling without adding detached particles, (5) increase the second-axis rotation range so the silhouette changes materially rather than turning almost exclusively around its long axis.

### Round 2

Captures: `/tmp/am-artwork-reference-round2.png`, `/tmp/am-artwork-round2.png`. Foreground specimen remains original and deliberately occludes part of the background, unlike the reference's empty hero.

Five corrections: (1) measured approximately6500 occupied glyph cells in our broad surface versus2500–2800 reference samples; introduce one elongated aperture to create connected open folds and more blank space, (2) replace repetitive X-heavy shading with a finer punctuation/weight ramp, (3) adjust initial tilt to avoid a centered vertical text column, (4) reduce angular velocity from0.075 to0.028rad/s after temporal comparison showed our rotation too prominent, (5) preserve motion phase across landing/workspace remounts instead of visibly restarting. Also fix static-stage refresh in reduced-motion mode.

### Round 3

Captures: `/tmp/am-artwork-reference-round3.png`, `/tmp/am-artwork-round3.png`. Occupied cells after round2: approximately2607–3059 across sampled orientations, close to the reference samples rather than a solid text slab.

Five corrections: (1) reduce the oversized aperture so the two folds read as one form, (2) introduce measured asymmetry within the original surface rather than mirrored lobes, (3) pull in the broadest pose to restore more empty lateral space, (4) slightly strengthen shading response where punctuation had become too faint, (5) increase the renderer update ceiling from15Hz to about22Hz for smaller visible steps without speeding up rotation. Exact reference frame rate is not asserted. Also center the grid when resolution caps apply on larger displays.

The final capture after all three correction rounds is `/tmp/am-artwork-final.png`. Geometry is deliberately original; likeness is in a single fixed oversized monochrome character-rendered form, slow projection changes, foreground occlusion and constant glyph scale—not a copy of the reference sculpture.

## Final regression and implementation checks

- Production build and TypeScript checks passed. Frontend19 tests passed; backend11 tests passed. Health endpoint returned `status: ok`.
- Created “Character artwork regression QA” through the landing form; uploaded both demo STLs; reloaded and verified both uploads persisted and the design model rendered.
- Visually exercised model orbit and camera reset with the character field running. Background pointer-events is `none`; one new layer and zero legacy SVG-background layers are present.
- Existing completed QA project: navigated reality/comparison/simulation/results, switched to overlay, saved material definitions and ran a fresh174N dual FEA solve. Expected actual results returned (FoS1.59→1.33, displacement1.4881→1.8601mm, stress31.52→31.52MPa).
- Browser warning/error logs were empty on both app tabs after verification.
- Renderer creates Canvas2D only, caps resolution at350×150cells, pauses on document visibility loss, uses no React state per frame, and cleans up RAF/ResizeObserver/media listeners. Reduced-motion mode draws a static frame and refreshes it on workflow changes; system preference was not changed for live testing.
- Final original surface samples contained2939–3688 occupied cells, depending on orientation. CPU projection measured roughly5.5–10.6ms per frame in a local Node diagnostic (not a browser frame-rate claim).
- No changes to backend, API contracts, STL loading, ModelViewer, camera controls, simulation or result-ranking code. No dependencies added. Existing Zod annotation/large Three.js chunk warnings and backend dependency deprecation remain non-blocking.
- Deleted/replaced old source: `EngineeringBackground.tsx`, `engineering-background.css`, and `EngineeringBackground.test.tsx`. Previous contents remain in this chat's edit history, not in active source. The old design document is explicitly marked superseded.
