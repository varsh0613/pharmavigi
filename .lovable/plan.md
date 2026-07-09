
# PharmaVigi — Build Plan

Building the selected direction (v2, Grotesk technical, pistachio dome) with a **larger, more pronounced dome cutout** in the header. Frontend-only with realistic mock data seeded for all 19 NSAIDs (Rofecoxib & Valdecoxib flag CRITICAL for the validation story). Live openFDA/AI wiring is a follow-up plan.

## Design tokens (src/styles.css)

- `--cream: #FAF8F3` (canvas), `--lavender: #BBB7E5`, `--rose: #F7DFDF`, `--pistachio: #B6C687`, `--snow: #DAE9FA`, `--baby-pink: #EFBDBD`, `--pale-yellow: #F3EDBD`
- Semantic tier accents (used sparingly): `--critical: #991B1B`, `--high: #B45309`, `--moderate: #CA8A04`, `--low: #65A30D`
- Fonts loaded via `<link>` in `__root.tsx` head: Instrument Sans (body/headings) + JetBrains Mono (labels/data)
- Card radius 24–32px

## Enlarged dome header

- Header pane bg `--pistachio`, height ~340px (up from ~256px)
- Semi-circular cutout at bottom center, radius ~96px (up from ~64px), implemented with a CSS `mask-image: radial-gradient(...)` so the cream canvas shows through
- Risk Index badge (circle, ~176px) sits IN the cutout, straddling header/body — crimson fill for CRITICAL, cream ring, shows "87 / Risk Index / Critical"
- Left of dome: drug identity (Rofecoxib, brand, CAS, class chips, drug selector dropdown, Add New Drug button)
- Right of dome: Total FDA Reports 152.3k + last-updated timestamp
- Top nav bar sits above: PharmaVigi logo, tab links (Profile / Compare / Class Overview / About)

## Screen 1 — Drug Profile bento (`/`)

Three-column bento on cream canvas, cards mixed in pastels:

**Left col (~3/12)** — yellow AI summary card, 2×2 KPI tiles (rose Serious, lavender Deaths, snow Hosp, baby-pink Disability), pistachio-tint Cost of Harm card ($4.85B, HIGH/CRITICAL only), Quick Safety chips row

**Middle col (~6/12)** — snow Adverse Event Trend line chart (Recharts, 2004 withdrawal marker, year range slider, toggle total/serious/deaths), Signal Detection table on cream card (PRR/ROR/χ², color-coded severity, sortable), grid of two: lavender Top Reactions horizontal bars + pistachio Outcome donut, class-comparison callouts row

**Right col (~3/12)** — baby-pink Regulatory Timeline (vertical, colored dots per event type: approval/signal/label/warning/withdrawal), Emerging Signals alert panel (crimson tint, pulsing dot), Demographics mini-card (age bars + gender donut + reporter type + avg age)

Global: skeleton loaders, empty states, tooltips on PRR/ROR/χ²/tier badges, Export button (UI-only for now).

## Screens 2–4 (built same pass, same design language, lower fidelity)

- `/compare` — Drug A vs B dropdowns w/ swap, side-by-side KPIs, dual-line trend, signal comparison (A-only / shared / B-only), side-by-side top reactions, stacked timelines, AI comparative summary
- `/class` — filter bar, class KPI summary strip, Recharts scatter (avg PRR × death rate, bubble = volume, color = tier — Rofecoxib & Valdecoxib labeled in top-right danger zone), leaderboard table for all 19 drugs with View Profile action
- `/about` — project summary, methodology cards (PRR/ROR/χ²/Risk Index/Cost formulas), data sources, 19-drug reference table, validation section (Rofecoxib/Valdecoxib/Lumiracoxib pass badges), limitations
- Add New Drug progress modal (staged steps, dismissible)

## Data

`src/data/drugs.ts` — one object per drug with all fields Screens 1–3 need, shaped to match a future openFDA response so it's a drop-in swap later. Includes: identity, KPIs, yearly trend series, top reactions, outcomes, signal table rows, emerging signals, timeline events, demographics, cost of harm, AI summary text.

## Tech notes

- TanStack Start routes as above; update `__root.tsx` `head()` with real title/description ("PharmaVigi — Drug Safety Intelligence")
- Recharts for line/bar/donut/scatter
- All colors as semantic tokens in `src/styles.css` using `oklch`
- No Lovable Cloud, no backend, no auth this pass

## Out of scope (future)

- Live openFDA API via `createServerFn`
- Real Gemini/Claude AI summaries
- FAERS 500K CSV ingestion
- Real Excel export
- Persistent user-added drugs

Ready to build.
