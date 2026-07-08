You're right sorry. Here it is — complete, with every feature included.

---

## Drug Safety Intelligence Dashboard
### A Live Pharmacovigilance Decision Support System

---

## In One Sentence

A live, extensible web dashboard that gives healthcare professionals, regulators, and researchers a complete 360° safety intelligence profile of any NSAID drug — combining real FDA adverse event data, statistical signal detection, regulatory market history, and AI-generated summaries — all from a single screen, one click, zero manual work.

---

## The Business Problem

Every quarter the FDA receives hundreds of thousands of adverse event reports. Pharmaceutical companies, hospitals, and regulators are legally required to monitor these. The process is manual, slow, and reactive. Dangerous patterns sit undetected in the data for months — sometimes years — before anyone acts.

Rofecoxib (Vioxx) is the proof. The cardiovascular signal was in FDA data for years before Merck withdrew it in 2004. Eventual litigation: $4.85 billion. Valdecoxib (Bextra) followed in 2005. Same story. The data had the answer both times. Nobody had a system to surface it clearly, early enough, in a format a decision-maker could act on.

This dashboard is that system.

---

## Who It Helps

**Pharma safety teams** — know which drugs need investigation before a recall forces their hand.

**Regulators** — triage thousands of incoming signals into a ranked priority list with cost attached.

**Hospital risk managers** — understand real-world drug risk profiles beyond what labels report.

**Patients** — indirectly protected as dangerous patterns are caught and acted on earlier.

---

## The Data — Three Sources Working Together

**Source 1 — Your scraped dataset (61K reports, 19 drugs)**
Pulled from the openFDA Drug Event API across the complete NSAID/COX-2 inhibitor therapeutic class. Fields: safetyreportid, receivedate, serious, seriousnessdeath, seriousnesshospitalization, seriousnessdisabling, seriousnesslifethreatening, patientonsetage, patientsex, drug names, reaction names, drug count, drug queried.

Used for: reaction rankings, death rates, hospitalization rates, demographic breakdown, outcome distribution. 5000 reports per drug is sufficient for all proportional analysis.

**Source 2 — FAERS historical dump (500K reports, 2015–2026)**
Used exclusively for year-by-year trend analysis. Shows when report volumes spiked, when they declined, and where emerging patterns are forming over the decade.

**Source 3 — openFDA live API (called on demand)**
Used for real-time total report counts, PRR/ROR computation against the full FDA database, drug label information, and current regulatory status. No API key. Public domain. This is what makes the system live rather than static.

**19 drugs pre-loaded at launch:**
Rofecoxib, Celecoxib, Diclofenac, Ibuprofen, Naproxen, Meloxicam, Piroxicam, Indomethacin, Ketoprofen, Etodolac, Sulindac, Flurbiprofen, Mefenamic Acid, Ketorolac, Oxaprozin, Valdecoxib, Etoricoxib, Aspirin, Nimesulide.

**User can add any drug at any time.** System pulls live data, runs full analysis, saves permanently. Fully extensible.

---

## The Methodology

**Signal Detection — PRR and ROR**

For every drug-reaction pair in the dataset the system computes:

PRR (Proportional Reporting Ratio) — how much more often a reaction appears for this drug vs all other drugs in the class. Threshold: PRR ≥ 2.

ROR (Reporting Odds Ratio) — the statistical odds of a reaction being linked to this drug vs not. Threshold: ROR ≥ 2.

Chi-square — confirms statistical significance. Threshold: χ² ≥ 4.

All three must cross threshold simultaneously. This is the EMA standard used by actual pharmacovigilance teams globally.

**Risk Scoring**

```
Severity Score  = (Deaths × 3) + (Hospitalisations × 2) + (Disabilities × 1)

Risk Index      = (PRR × 0.4) + (Severity Score × 0.4) + (Report Volume × 0.2)

CRITICAL  🔴  Risk Index > 75
HIGH      🟠  Risk Index > 50
MODERATE  🟡  Risk Index > 25
LOW       🟢  Risk Index ≤ 25
```

**Cost of Harm Estimation**

For every CRITICAL and HIGH signal:

```
Cost of Harm = (Death count × $500K avg litigation)
             + (Hospitalization count × $15K avg HCUP cost)
             + (Disability count × $200K avg settlement)
```

Public benchmarks. Clearly disclosed as modeled estimates for relative comparison, not audited figures.

**Validation**

Rofecoxib and Valdecoxib — both market withdrawals — must appear as CRITICAL tier. This is the built-in proof of concept. If the model flags both correctly using pre-withdrawal data, the methodology is validated against known real-world outcomes.

---

## Full Feature Set

---

### Screen 1 — Drug Profile

**Drug Selector**
Dropdown of all available drugs. Selecting a drug updates the entire dashboard instantly from cache or triggers a live pull if new.

**Drug Information Card**
Generic name, brand name, drug class, primary indication, manufacturer, FDA approval year, current regulatory status (Active / Withdrawn / Restricted / Black Box Warning).

**Executive KPI Cards**
Total adverse reports (live FDA count), serious reports, death reports, hospitalization reports, disability reports, latest reporting year, overall risk score, risk tier badge.

**Risk Tier Indicator**
Single prominent visual. CRITICAL / HIGH / MODERATE / LOW with color. Computed from the Risk Index formula above. One glance answer to "how dangerous is this drug."

**Adverse Event Trend**
Interactive line chart. Year by year report volume from 2015 to 2026 using your 500K historical dataset. Shows growth, decline, peak reporting periods, and post-withdrawal drop-off for withdrawn drugs.

**Top Reported Adverse Events**
Horizontal bar chart ranked by frequency. Top 10 reactions from your 61K sample. Death, cardiac events, GI reactions, renal failure — whatever the data surfaces for that drug.

**Demographic Analysis**
Age group distribution, gender split, top reporting countries, reporter type breakdown (physician, consumer, pharmacist, lawyer). All from your 61K sample.

**Outcome Distribution**
Donut chart. Hospitalization, disability, death, life-threatening, recovered, unknown. Proportions from your sample data.

---

**Drug Market History and Regulatory Timeline** ⭐⭐⭐

This is the star feature of the entire dashboard. A complete chronological history of the drug from first synthesis to current status — displayed as a vertical or horizontal timeline that tells the drug's entire story in one glance.

Every drug gets a timeline built from a curated reference dataset you maintain. Events include:

```
🔬  First synthesised / discovered
📋  Clinical trials begin
✅  FDA approval granted
🏪  Market launch
📈  Reports begin accumulating in FAERS
⚠️   First internal safety signal detected
📰  FDA issues safety communication
🏷️   Drug label updated
🚨  Black box warning added
🔴  Market withdrawal (if applicable)
📄  Generic versions approved
📊  Current status
```

For withdrawn drugs like Rofecoxib and Valdecoxib the timeline shows the full arc from approval to recall — making it immediately clear how long the danger signal existed before action was taken. This is the visual that makes your thesis argument in one image.

For active drugs it shows the current safety history and any ongoing regulatory activity.

---

**Emerging Signal Detection** ⭐⭐⭐

Doesn't just show charts. Points the user directly at potential safety concerns.

Computed from PRR/ROR results and trend data combined. Surfaces alerts like:

```
⚠️  Liver toxicity reports increased 34% since 2022
⚠️  Neurological reactions showing upward trend
⚠️  New cardiac signal detected — PRR 3.2, above threshold
⚠️  Death rate higher than class average
✅  No new signals detected in last 12 months
```

This is the analytical intelligence layer that separates this from a reporting dashboard into an actual decision support system.

---

**Quick Safety Indicators**
Status chips. FDA Approved, Black Box Warning, Recall History, Label Updated, Recent Safety Alert. Visual at a glance.

**AI Drug Summary** ⭐⭐⭐
Claude-generated three sentence executive summary built automatically from your computed statistics. Example:

*"Rofecoxib (Vioxx) carries a CRITICAL risk classification based on a PRR of 4.2 for cardiovascular events and a death rate of 8.5% across reported cases — significantly above the class average of 2.1%. Cardiovascular reactions including myocardial infarction and cardiac arrest represent the dominant adverse event profile, with report volumes peaking in 2003–2004 immediately preceding market withdrawal. The estimated cost of harm associated with flagged signals exceeds $2.1 billion, consistent with the $4.85 billion in litigation that followed the 2004 recall."*

Saves a safety analyst from reading thousands of individual reports. Tells the story in three sentences.

---

### Screen 2 — Drug Comparison

Select Drug A and Drug B. Full side by side view:

Risk scores and tiers compared. Total reports, serious reports, deaths, hospitalizations compared. Top reactions for each with overlap highlighted. Year by year trend lines on the same chart. Timeline comparison — see regulatory history side by side. Safety indicator chips for both. AI comparative summary — Claude explains the key differences in safety profile in plain English.

Example output: *"Compared to Diclofenac, Celecoxib shows a lower rate of gastrointestinal adverse events but a higher proportion of cardiovascular signals — consistent with the known COX-2 selectivity risk profile. Diclofenac carries a longer reporting history with more total reports, while Celecoxib's signal strength has increased since 2018."*

---

### Add New Drug

User types any drug name. Clicks Add. Live progress shown:

```
⏳  Pulling live FDA reports...
⚙️   Running signal detection...
📊  Computing risk score...
📅  Building regulatory timeline...
🧠  Generating AI summary...
✅  Dashboard ready
```

15–30 seconds first time. Saved permanently to JSON. Instant on every load after. Demonstrates live system capability to thesis committee without hiding the processing behind a spinner.

---

### Data Export

Excel export of the full drug analysis — KPIs, signal table, risk scores, cost estimates, demographic breakdown. One button. One file. Clean for thesis appendix.

---

## System Architecture

```
React Frontend (Lovable)
         ↕
   FastAPI Backend
    ↕          ↕          ↕
openFDA     Your CSVs   Claude
Live API    61K + 500K  API
         ↕
    JSON Cache
  (one file per drug)
```

No database. No SQL. No Docker. Runs locally. Demo from laptop. Exactly right for a thesis prototype.

---

## Tech Stack

```
Frontend    React via Lovable
Backend     FastAPI (Python)
Analysis    Pandas, Scipy, NumPy
Cache       JSON files (one per drug)
AI          Claude API (Anthropic)
Live Data   openFDA API
Local Data  61K scraped CSV + 500K FAERS CSV
```

---

## Why This Is Not A Kaggle Project

Kaggle adverse event projects do one thing: train a classification model to predict whether a patient will have a reaction. Binary output. ML pipeline. Accuracy score.

This does something completely different. No ML. No model training. No accuracy score. The method is statistical signal detection — PRR and ROR — the same methodology used by the WHO and EMA on real drug safety databases. The output is not a prediction. It is a ranked, costed, decision-ready intelligence product that a safety team can open on Monday morning and immediately know what to investigate.

The addition of market history, regulatory timeline, cost of harm estimation, and AI summaries takes it further than most academic pharmacovigilance papers go. Those papers stop at signal detection. This project translates signals into business decisions.

---

## Validation Built In

Two market withdrawals in the pre-loaded drug set. Both must flag CRITICAL. If they do — the methodology is validated. The thesis defense writes itself.

---

## One-Line Pitch

*"A one-click executive dashboard that transforms real FDA adverse event data, statistical signal detection, complete drug market history, and AI-generated intelligence into a live pharmacovigilance decision support system — built for the healthcare professionals who need it most."*