# Measured visual system — 2026-10-05

Reference: https://www.maximiliankaspar.com/?ref=siteinspire
Inspection: live rendered browser, desktop viewport 1512 × 982; additional samples at 760 and 390px. No source implementation, fonts, photography, branding, or other assets copied.

## Measurements before implementation

| Element | Measured presentation |
| --- | --- |
| Page | Full viewport width, no centered narrow container; white rgb(255,255,255) |
| Foreground | Black rgb(0,0,0); reverse white on black on compact hovered rows |
| Outer content | x=10 through x=1502: 1492px wide |
| Grid | 12 internal tracks of approximately 115.17px with 10px gaps; four media columns 365.5px wide |
| Four column starts | 10, 385.5, 761, 1136.5px |
| Navigation | y=15px; monospace, 14px, weight 400, line-height 17.5px; normal letter spacing, lowercase |
| Project title | Monospace, 14px, weight 700, line-height 17.5px, lowercase |
| Category/year | Monospace, 14px, weight 400 (some active states bold), line-height 17.5px; x≈761 and 1136.5 |
| Body/intro | Book-weight sans-serif, 14px/17.5px, weight 400; intro width 615.83px (five internal tracks) |
| Client labels/values | Small sans-serif text; aligned at halfway and three-quarter columns, not badges |
| Captions | Book monospace, 12px/18px; directly beneath image, approximately 2px separation |
| Homepage introduction | Display sans-serif, 111px/113.22px, weight 400, normal spacing; distinct from project typography |
| Font categories | Reference uses proprietary Neue Montreal Book/Mono and Bugrino; independent implementation uses system grotesk and system monospace, not copied font files |
| Project heading row | 17.5px text row, wrapper 10px padding; title/category/year share one baseline |
| Intro to media | About 20px after the intro block; closed intro removes that block rather than preserving blank dashboard space |
| Image sizes | 365.5px wide; observed heights 456.875, 274.125, 365.5px (4:5, 4:3, 1:1); native content ratios retained |
| Image spacing | 10px horizontal gutters, approximately 40px row separation after the tallest caption; intentionally uneven lower image edges |
| Section rhythm | Long content-led media sequences, compact project header/intro; large whitespace mainly around the homepage artwork, not every project heading |

## Interaction observations

- Navigation and ordinary links expose pointer cursors. Navigation hover reverses the small text area; no oversized CTA box.
- Project title row is clickable; clicking opens/closes description and metadata. A compact black reverse-text strip appears under the pointer. Content responds within a fraction of a second.
- Measured computed CSS transition duration on navigation, project titles, and sampled images is 0s, timing function `ease`. Do not claim that this exposes the timing of script-driven transitions.
- Images enter with transient opacity/position changes while scrolling; subsequent captures settle at opacity 1 / transform none. Exact scripted easing and duration are not recoverable from these computed-style samples. Independent equivalent: short 200ms ease-out content reveal, reduced-motion opt-out; no continuous model animation.
- Media cursor is pointer; sampled video elements autoplay, loop, are muted, and have no native controls. Our interactive geometry retains its required orbit/pan/zoom/reset instead of pretending to be a video.
- Background includes actual 0.5px gray (#808080) structural lines at x≈5,380.25,755.5,1130.75,1506 in the hero, plus extremely fine graphic texture. Visible behind project content in sampled scroll states. Per the user's explicit correction, do not recreate a persistent engineering grid; preserve alignment without lines.
- Responsive samples: at 760px media is two columns of 365px with 10px margins/gap; at 390px it is two 180px columns. Body/project text remains 14px; hero samples are 69px and 50px. Exact media-query thresholds not inferred. Our dense engineering forms collapse to one column when needed for usability.

## Independent mapping

1. Project title/category/year → workflow title/analysis type/actual status.
2. Media spread → isolated 3D presentation with external small captions, no viewer card/background.
3. Project intro and credits → brief explanation and measured engineering data.
4. Navigation remains plain 14px monospace; underline/marker for active state, text-sized hover.
5. Main workflow titles use project-title scale, not the reference's homepage display size.
6. Existing orange denotes reality or attention only. No copied project-specific accents.
7. Ordinary actions become underlined text/arrow links; native button semantics, keyboard focus and disabled states remain.
8. No changes to solver, API contracts, STL parsing, camera mathematics, persistence, or result-ranking logic.

## Screenshot iteration log

Baseline reference captures: `/tmp/am-reference-home-measured.png`, `/tmp/am-reference-project-measured.png`.
Two implementation review rounds are recorded below after comparison at the same viewport.

### Round 1 — measured comparison and corrections

Captured `/tmp/am-publication-round1-design.png`, `...-results.png`, and `...-landing.png` at 1512×982; compared with the live project spread and homepage captures above.

Five largest remaining discrepancies and corrections:
1. Workflow project row at y≈134 vs sampled reference project row y≈99: remove 30px of combined navigation/content padding.
2. Navigation clustered left rather than distributed on the internal grid: distribute five workflow entries on the 12-track grid, retaining a deliberate two-track gap.
3. Geometry data remained widget-like: replace oversized dimension metrics with a semantic 14px monospace definition list, labels and values aligned on the half/three-quarter columns.
4. Results used thirds: align the prioritized comparison to the left half, with secondary metrics on the two remaining quarter columns. Preserve ranking and actual data.
5. Excess glyph chrome and caption inconsistency: suppress redundant upload icons and use 12px media captions, while retaining all buttons and accessible labels.

No camera, STL, solver, or persistence changes were needed in this round.

### Round 2 — second comparison and corrections

Captured `...round2-design.png`, `...round2-simulation.png`, `...round2-comparison.png`, and `...round2-results.png` at 1512×982; compared again with the measured reference spread.

Five remaining discrepancies and corrections:
1. Static workflow headings lacked the reference's project disclosure: make the title a keyboard-accessible intro toggle with a small +/− indicator and text-sized reverse hover.
2. Generic model captions lacked file-specific media context: show the actual uploaded filename with design/reality identification.
3. Comparison metadata had a duplicated heading: retain one concise table caption and explicit physical-unit caveat.
4. Material editors still resembled software field grids: align each editable value beside its metadata label, retaining native inputs, labels, validation, and units.
5. Per-model result summaries still resembled three oversized metric widgets: reduce them to 14px monospace label/value/unit rows beneath each model. Preserve the prioritized comparisons above the models.

These changes affect presentation and intro disclosure only; engineering logic and the renderer remain untouched.

## Final verification

- Final 1512×982 captures: `/tmp/am-publication-final-landing.png`, `...-design.png`, `...-reality.png`, `...-comparison.png`, `...-overlay.png`, `...-simulation.png`, `...-results.png`.
- Backend health returned `status: ok`; frontend remained available at http://localhost:5173.
- Browser: created “Measured visual system — QA”; uploaded both demo STLs; verified design retrieval after reload and measured geometry dimensions after the second upload.
- Existing completed QA project: reran real geometry comparison, switched split/overlay, saved both material definitions, submitted 174 N with X-max loading and X-min support, received dual FEA results, generated the backend engineering summary, reloaded and recovered results.
- Verified project-description disclosure, visible 3D meshes, orbit and reset. Renderer/camera controls were not modified.
- 390px responsive sample: document width remained 390px, no page-level horizontal overflow; model, metadata and upload controls remained visible.
- Captured browser error/warning log was empty.
- Final production build/typecheck passed. Frontend: 15 tests passed. Backend: 11 tests passed.
- Non-blocking existing build diagnostics: large lazy-loaded Three.js chunk, Zod annotation warnings; backend test dependency deprecation warning.
- React review: kept heavy 3D components lazy-loaded, reused existing mesh context, introduced only local disclosure state, and retained native accessible form/button semantics.
- Deliberate independent substitutions: system grotesk/monospace instead of proprietary reference fonts; no reference assets or code copied. Engineering geometry and forms remain functional rather than reproducing decorative portfolio media.
