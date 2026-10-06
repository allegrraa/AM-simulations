# Interaction polish — 2026-10-05

## Scope

Frontend-only polish. Backend, API contracts, FEA, comparison calculations,
scientific displacement color mapping, and character-artwork rendering are unchanged.

## Typography measured from the live reference

Reference: https://www.maximiliankaspar.com/?ref=siteinspire

| Role | Computed reference family | Weight / metrics | Local substitute |
| --- | --- | --- | --- |
| Display | Bugrino | 400, 90px / 91.8px at inspected viewport, normal tracking | Helvetica Neue |
| Body | Neue Montreal Book | 400, 14px / 17.5px, normal tracking | Helvetica Neue |
| Navigation / metadata | Neue Montreal Mono | 400, 14px / 17.5px | Menlo |
| Project headings | Neue Montreal Mono | 700, 14px / 17.5px | Menlo |
| Captions | Neue Montreal Mono | 400, 12px / 18px | Menlo |

Computed optical sizing is `auto`. No reference font was present in the project
or installed font locations inspected. Helvetica Neue and Menlo are available
on this Mac; they are referenced as system fonts, never copied or redistributed.
The former external Google Fonts import was removed. Display size remains responsive
to preserve the existing layout; line-height is 1.02 and tracking is now normal.
These are metric-conscious substitutes, not an assertion of identical letterforms.

## Color and controls

- Existing warm background: `#f5f3ed`; near-black: `#242522`.
- One accent definition in `src/styles.css`: `--accent: #b5482d`.
- Warning/danger aliases and reality Three.js materials resolve that token.
- Beige CTA text on the accent measures approximately 4.82:1 contrast.
- Primary actions are square, 44px minimum height, with 5px arrow movement.
- Active workflow, split/overlay, nonzero geometry deltas, adverse result deltas,
  review states, form focus, and reality emphasis use the same accent.

## Interaction and motion

- All viewers share `enableZoom={false}`. The installed OrbitControls wheel
  handler returns before `preventDefault` when zoom is disabled.
- Explicit +/− controls change camera zoom independently of orbit/pan.
  Reset restores the fully fitted view. Middle/right drag and the pan tool pan.
- Canvas measures untransformed offset dimensions and does not subscribe to page
  scrolling. This prevents CSS scroll scaling from resizing/re-fitting the camera.
- Reference DOM identified Lenis. The implementation here independently uses
  Lenis 1.3.26 with modest `lerp: 0.2`, native touch behavior, and anchor support.
- Pointer-down cancels residual inertia; form scrollers retain native handling.
- Scroll transforms use one passive listener plus a coalesced animation frame;
  no React state is updated by page scroll.
- Models scale .97–1.02, the large heading .985–1 with at most 4px translation,
  and the existing background wrapper moves at most 12px. Its drawing logic is untouched.
- Entrance fades finish within 620ms; dense engineering data does not float.
- Reduced motion destroys Lenis, clears scroll transforms, disables entrance
  motion, and preserves the existing static artwork behavior. Preference changes
  are handled at runtime, with cleanup for React StrictMode.

## Verification so far

- Production build and TypeScript passed; 22 frontend tests and 11 backend tests passed.
- Health endpoint passed on port 8000; frontend served on port 5173.
- In-app browser at 1512×982: project `Interaction polish QA` created via UI,
  design and as-manufactured demo STL files uploaded, geometry comparison completed,
  materials saved, 120N dual FEA solve completed, and engineering summary generated.
- Results: design/as-manufactured stress 21.74/40.52 MPa, displacement
  1.0263/2.6443 mm, and factor of safety 2.30/1.04.
- Scroll inputs exercised over landing, design, reality, both split viewers,
  overlay, simulation, and both result viewers. Explicit zoom state remained unchanged.
- Orbit, pan, explicit zoom, reset, and displacement overlay exercised visually.
- No warning/error entries in the test tab console.
- Unit tests verify reduced-motion startup, live preference changes, cleanup,
  and interruption of inertia on intentional interaction.
- Safari/macOS follow-up passed in the full-size Mac window (approximately 1512px wide).
  Project `Safari polish QA` was created through Safari, both demo STLs uploaded,
  comparison completed, materials saved, and a 120N dual solve and summary generated.
  The resulting values match the in-app-browser run above.
- Safari scroll inputs over the landing, Design, Reality, both split viewers,
  overlay, Simulation, and both Results viewers moved the page. Orbit, pan,
  explicit +/− and reset were exercised on the loaded design model.
- Safari Web Inspector showed only Vite connection messages, with no console errors.
- Safari's page-only Reduce motion override was tested: `matchMedia` returned true,
  the `lenis` class was removed, both model transforms and the background transform
  computed to `none`, and model zoom levels remained `1`. Navigation and native page
  scrolling worked in this mode. The override was then restored to System (Off),
  and the `lenis` class returned. No macOS system preferences were changed.
- Safari was left on the completed Results view. Screenshot evidence:
  `/tmp/am-safari-polish-verified.png`.
- Existing non-blocking build warnings remain: large lazy Three.js chunk and
  dependency PURE annotations; backend tests report an existing Starlette deprecation.
