# Layout polish verification

## Scope

Focused refinement of `src/polish.css` and the next-step actions in `src/App.tsx`.
Backend contracts, solver behavior, Three.js rendering, split/overlay logic,
the symbol drawing system, and smooth-scroll implementation were left unchanged.

The live Maximilian Kaspar reference was inspected. Its quiet vertical editorial
structure informed four column guides, not a repeating square grid. Guides use
4.5% foreground opacity and match the content's 24px gutters. Existing artwork
sits above the guides; beige text backplates keep important copy readable.

## Refinements

- Shared spacing tokens: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px.
- Body copy capped at 65ch; secondary technical notes at 70ch with normal wrapping.
- Sans-serif page/section titles and engineering values; smaller mono labels/units.
- Wrapping flex/grid children and fixed-layout data tables prevent horizontal overflow.
- Clear editable input borders and accent-colored focus states.
- Bottom-right next-step actions with muted disabled reasons. Results offers a
  review-setup action; summary generation and display controls remain secondary.

## Browser checks

Manually inspected Landing, Design, Reality, Compare/Split, Compare/Overlay,
Simulation, and Results at 1512px and 1024px. Inspected lower-page notes,
metadata, forms, tables, and actions as well as the initial viewport.

DOM width checks covered all seven views at 1728, 1512, 1440, 1280, and 1024px
(982px viewport height). No horizontal page overflow or measured copy overflow
was found in those checks. Visual review supplements these checks; the DOM checks
alone do not prove the absence of every possible overlap.

Verified against the running local backend:

- Created `Layout polish QA` through the landing form.
- Empty Design has a disabled continuation action and a visible upload reason.
- Existing loaded Design continues to Reality; Compare geometry opens comparison.
- Split and Overlay render the existing models; overlay explanation wraps normally.
- Continue to simulation opens the setup form.
- Ran the existing complete QA project at 120 N and reached real Results.
- Results review action returns to Simulation.
- No browser warning/error logs in either QA tab at the end of these checks.
- Production build/typecheck and all 22 frontend tests passed.

Non-blocking build warnings remain: third-party Zod pure annotations and the
large Three.js viewer chunk. No dependency or bundle restructuring was done in
this focused polish pass.

Screenshot: `/tmp/am-layout-polish-compare.jpg` (local QA evidence).
