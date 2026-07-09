// Mock pharmacovigilance data for 19 NSAIDs.
// Shape mirrors a future openFDA + FAERS response so the swap is drop-in.

export type Tier = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
export type Status = "Active" | "Withdrawn" | "Restricted";

export type TimelineEvent = {
  date: string; // "MAY 1999"
  title: string;
  detail: string;
  kind:
    | "discovery"
    | "approval"
    | "launch"
    | "signal"
    | "label"
    | "blackbox"
    | "alert"
    | "withdrawal"
    | "generic"
    | "current";
};

export type SignalRow = {
  reaction: string;
  reports: number;
  prr: number;
  ror: number;
  chi2: number;
  strength: "Strong" | "Moderate" | "Weak" | "None";
};

export type EmergingSignal = {
  severity: "HIGH" | "MEDIUM" | "LOW" | "OK";
  kind: "TREND_INCREASE" | "STRONG_SIGNAL" | "NEW_REACTION" | "OK";
  message: string;
};

export type Drug = {
  id: string;
  generic: string;
  brand: string;
  cas?: string;
  drugClass: string;
  indication: string;
  manufacturer: string;
  approvalYear: number;
  withdrawalYear?: number;
  status: Status;
  tier: Tier;
  riskIndex: number; // 0-100
  totalReports: number;
  serious: number;
  deaths: number;
  hospitalizations: number;
  disabilities: number;
  lifeThreatening: number;
  latestYear: number;

  deathRatePct: number;
  seriousRatePct: number;
  classAvgDeathRatePct: number;
  classAvgSeriousRatePct: number;
  strongestPRR: number;
  classAvgPRR: number;

  costOfHarmUSD: number; // total
  costBreakdown: { deaths: number; hosp: number; disability: number };

  yearlyReports: { year: number; total: number; serious: number; deaths: number }[];
  topReactions: { reaction: string; count: number; isSignal: boolean }[];
  outcomes: {
    death: number;
    hospitalization: number;
    disability: number;
    lifeThreatening: number;
    recovered: number;
    unknown: number;
  };
  signals: SignalRow[];
  emerging: EmergingSignal[];
  timeline: TimelineEvent[];
  demographics: {
    ageGroups: { label: string; value: number }[];
    genderFemalePct: number;
    reporterTypes: { label: string; value: number }[];
    avgAge: number;
  };
  safetyChips: { label: string; on: boolean }[];
  summary: string;
  scoreBreakdown: { severity: number; signal: number; volume: number };
};

// ----- Rofecoxib (Vioxx) — fully populated CRITICAL / Withdrawn -----
const rofecoxib: Drug = {
  id: "rofecoxib",
  generic: "Rofecoxib",
  brand: "Vioxx",
  cas: "162011-90-7",
  drugClass: "COX-2 Selective NSAID",
  indication: "Osteoarthritis, acute pain, dysmenorrhea",
  manufacturer: "Merck & Co.",
  approvalYear: 1999,
  withdrawalYear: 2004,
  status: "Withdrawn",
  tier: "CRITICAL",
  riskIndex: 87,
  totalReports: 152300,
  serious: 34200,
  deaths: 12408,
  hospitalizations: 44192,
  disabilities: 8911,
  lifeThreatening: 6120,
  latestYear: 2024,
  deathRatePct: 8.1,
  seriousRatePct: 22.4,
  classAvgDeathRatePct: 2.9,
  classAvgSeriousRatePct: 12.1,
  strongestPRR: 5.21,
  classAvgPRR: 1.4,
  costOfHarmUSD: 8_654_000_000,
  costBreakdown: { deaths: 6_204_000_000, hosp: 662_880_000, disability: 1_782_200_000 },
  yearlyReports: [
    { year: 1999, total: 1200, serious: 240, deaths: 40 },
    { year: 2000, total: 8400, serious: 1900, deaths: 420 },
    { year: 2001, total: 18200, serious: 4100, deaths: 1120 },
    { year: 2002, total: 28900, serious: 6800, deaths: 2210 },
    { year: 2003, total: 41200, serious: 9800, deaths: 3480 },
    { year: 2004, total: 38400, serious: 8600, deaths: 3810 },
    { year: 2005, total: 9100, serious: 1700, deaths: 780 },
    { year: 2006, total: 3200, serious: 520, deaths: 210 },
    { year: 2010, total: 1400, serious: 210, deaths: 90 },
    { year: 2015, total: 800, serious: 110, deaths: 40 },
    { year: 2020, total: 620, serious: 90, deaths: 30 },
    { year: 2024, total: 480, serious: 60, deaths: 18 },
  ],
  topReactions: [
    { reaction: "Myocardial Infarction", count: 14200, isSignal: true },
    { reaction: "Cardiac Arrest", count: 8900, isSignal: true },
    { reaction: "Ischemic Stroke", count: 6100, isSignal: true },
    { reaction: "Thrombosis", count: 4400, isSignal: true },
    { reaction: "Hypertension", count: 3800, isSignal: false },
    { reaction: "GI Hemorrhage", count: 3200, isSignal: false },
    { reaction: "Renal Failure", count: 2900, isSignal: true },
    { reaction: "Sudden Cardiac Death", count: 2100, isSignal: true },
    { reaction: "Congestive Heart Failure", count: 1800, isSignal: true },
    { reaction: "Edema Peripheral", count: 1600, isSignal: false },
  ],
  outcomes: {
    death: 12408,
    hospitalization: 44192,
    disability: 8911,
    lifeThreatening: 6120,
    recovered: 62400,
    unknown: 18269,
  },
  signals: [
    { reaction: "Myocardial Infarction", reports: 14200, prr: 5.21, ror: 5.88, chi2: 842.1, strength: "Strong" },
    { reaction: "Cardiac Arrest", reports: 8900, prr: 3.94, ror: 4.12, chi2: 512.4, strength: "Strong" },
    { reaction: "Ischemic Stroke", reports: 6100, prr: 3.11, ror: 3.34, chi2: 288.6, strength: "Strong" },
    { reaction: "Thrombosis", reports: 4400, prr: 2.84, ror: 2.98, chi2: 201.3, strength: "Strong" },
    { reaction: "Renal Failure", reports: 2900, prr: 2.24, ror: 2.31, chi2: 88.4, strength: "Moderate" },
    { reaction: "Sudden Cardiac Death", reports: 2100, prr: 3.42, ror: 3.51, chi2: 142.0, strength: "Strong" },
    { reaction: "Congestive Heart Failure", reports: 1800, prr: 2.11, ror: 2.18, chi2: 61.2, strength: "Moderate" },
    { reaction: "Hypertension", reports: 3800, prr: 1.62, ror: 1.68, chi2: 24.1, strength: "Weak" },
    { reaction: "GI Hemorrhage", reports: 3200, prr: 0.71, ror: 0.68, chi2: 12.4, strength: "None" },
    { reaction: "Edema Peripheral", reports: 1600, prr: 1.42, ror: 1.45, chi2: 14.8, strength: "Weak" },
  ],
  emerging: [
    { severity: "HIGH", kind: "STRONG_SIGNAL", message: "Cardiovascular signal (PRR 5.21) persists in post-withdrawal legacy reports" },
    { severity: "MEDIUM", kind: "NEW_REACTION", message: "New ischemic stroke cluster detected in elderly demographic (n=412)" },
    { severity: "LOW", kind: "TREND_INCREASE", message: "Renal failure reports up 12% in the last 12 months" },
  ],
  timeline: [
    { date: "1994", title: "Discovery", detail: "Compound synthesized at Merck Research Labs.", kind: "discovery" },
    { date: "MAY 1999", title: "FDA Approval", detail: "Approved for osteoarthritis and acute pain.", kind: "approval" },
    { date: "JUN 1999", title: "Market Launch", detail: "Launched as Vioxx® by Merck & Co.", kind: "launch" },
    { date: "NOV 2000", title: "VIGOR Trial Signal", detail: "Cardiovascular events 4x higher vs. naproxen.", kind: "signal" },
    { date: "APR 2002", title: "Label Revision", detail: "Cardiovascular precautions added to label.", kind: "label" },
    { date: "SEP 2004", title: "Global Market Withdrawal", detail: "Voluntarily withdrawn after APPROVe study.", kind: "withdrawal" },
    { date: "2007", title: "Settlement", detail: "Merck sets aside $4.85B for litigation.", kind: "alert" },
    { date: "2024", title: "Current Status", detail: "Remains withdrawn. No generics approved.", kind: "current" },
  ],
  demographics: {
    ageGroups: [
      { label: "<30", value: 4 },
      { label: "30–49", value: 14 },
      { label: "50–64", value: 32 },
      { label: "65–79", value: 38 },
      { label: "80+", value: 12 },
    ],
    genderFemalePct: 62,
    reporterTypes: [
      { label: "Physician", value: 41 },
      { label: "Consumer", value: 28 },
      { label: "Lawyer", value: 18 },
      { label: "Pharmacist", value: 9 },
      { label: "Other", value: 4 },
    ],
    avgAge: 68,
  },
  safetyChips: [
    { label: "FDA Approved", on: true },
    { label: "Black Box Warning", on: true },
    { label: "Recall History", on: true },
    { label: "Withdrawn", on: true },
    { label: "Recent Safety Alert", on: true },
  ],
  summary:
    "Rofecoxib (Vioxx) carries a CRITICAL classification driven by a PRR of 5.21 for myocardial infarction and a death rate of 8.1% — nearly 3× the NSAID class average of 2.9%. Cardiovascular reactions dominate the adverse event profile with report volumes peaking in 2003–2004 immediately preceding voluntary market withdrawal. Estimated cost of harm exceeds $8.6B, consistent with the $4.85B Merck litigation settlement.",
  scoreBreakdown: { severity: 9.2, signal: 8.8, volume: 8.1 },
};

// Helper to build lighter-fidelity drug records
function makeDrug(input: Partial<Drug> & Pick<Drug, "id" | "generic" | "brand" | "drugClass" | "manufacturer" | "approvalYear" | "status" | "tier" | "riskIndex" | "totalReports" | "deaths" | "strongestPRR">): Drug {
  const totalReports = input.totalReports;
  const deaths = input.deaths;
  const serious = input.serious ?? Math.round(totalReports * 0.18);
  const hospitalizations = input.hospitalizations ?? Math.round(totalReports * 0.24);
  const disabilities = input.disabilities ?? Math.round(totalReports * 0.045);
  const lifeThreatening = input.lifeThreatening ?? Math.round(totalReports * 0.035);
  const deathRatePct = +(100 * deaths / totalReports).toFixed(1);
  const seriousRatePct = +(100 * serious / totalReports).toFixed(1);
  const costOfHarmUSD = deaths * 500_000 + hospitalizations * 15_000 + disabilities * 200_000;

  const startYear = input.approvalYear;
  const endYear = input.withdrawalYear ?? 2024;
  const years: number[] = [];
  for (let y = Math.max(2004, startYear); y <= endYear; y++) years.push(y);
  const yearlyReports =
    input.yearlyReports ??
    years.map((year, i) => {
      const wave = Math.sin((i / years.length) * Math.PI) + 0.5;
      const base = Math.round((totalReports / years.length) * (0.4 + wave));
      return {
        year,
        total: base,
        serious: Math.round(base * 0.18),
        deaths: Math.round(base * (deathRatePct / 100)),
      };
    });

  return {
    id: input.id,
    generic: input.generic,
    brand: input.brand,
    cas: input.cas,
    drugClass: input.drugClass,
    indication: input.indication ?? "Pain, inflammation",
    manufacturer: input.manufacturer,
    approvalYear: input.approvalYear,
    withdrawalYear: input.withdrawalYear,
    status: input.status,
    tier: input.tier,
    riskIndex: input.riskIndex,
    totalReports,
    serious,
    deaths,
    hospitalizations,
    disabilities,
    lifeThreatening,
    latestYear: endYear,
    deathRatePct,
    seriousRatePct,
    classAvgDeathRatePct: 2.9,
    classAvgSeriousRatePct: 12.1,
    strongestPRR: input.strongestPRR,
    classAvgPRR: 1.4,
    costOfHarmUSD,
    costBreakdown: {
      deaths: deaths * 500_000,
      hosp: hospitalizations * 15_000,
      disability: disabilities * 200_000,
    },
    yearlyReports,
    topReactions: input.topReactions ?? [
      { reaction: "Nausea", count: Math.round(totalReports * 0.09), isSignal: false },
      { reaction: "GI Hemorrhage", count: Math.round(totalReports * 0.07), isSignal: input.strongestPRR > 2 },
      { reaction: "Dyspepsia", count: Math.round(totalReports * 0.06), isSignal: false },
      { reaction: "Headache", count: Math.round(totalReports * 0.05), isSignal: false },
      { reaction: "Hypertension", count: Math.round(totalReports * 0.045), isSignal: false },
      { reaction: "Renal Failure", count: Math.round(totalReports * 0.04), isSignal: input.strongestPRR > 2 },
      { reaction: "Peptic Ulcer", count: Math.round(totalReports * 0.035), isSignal: false },
      { reaction: "Dizziness", count: Math.round(totalReports * 0.03), isSignal: false },
    ],
    outcomes: input.outcomes ?? {
      death: deaths,
      hospitalization: hospitalizations,
      disability: disabilities,
      lifeThreatening,
      recovered: Math.round(totalReports * 0.42),
      unknown: Math.round(totalReports * 0.12),
    },
    signals:
      input.signals ??
      [
        { reaction: "GI Hemorrhage", reports: Math.round(totalReports * 0.07), prr: input.strongestPRR, ror: input.strongestPRR * 1.05, chi2: input.strongestPRR * 22, strength: input.strongestPRR >= 3 ? "Strong" : input.strongestPRR >= 2 ? "Moderate" : "Weak" },
        { reaction: "Renal Failure", reports: Math.round(totalReports * 0.04), prr: input.strongestPRR * 0.7, ror: input.strongestPRR * 0.75, chi2: input.strongestPRR * 14, strength: input.strongestPRR >= 3 ? "Moderate" : "Weak" },
        { reaction: "Hypertension", reports: Math.round(totalReports * 0.045), prr: 1.42, ror: 1.48, chi2: 18.1, strength: "Weak" },
        { reaction: "Peptic Ulcer", reports: Math.round(totalReports * 0.035), prr: 1.88, ror: 1.94, chi2: 34.2, strength: "Weak" },
        { reaction: "Cardiac Failure", reports: Math.round(totalReports * 0.025), prr: input.strongestPRR * 0.5, ror: input.strongestPRR * 0.55, chi2: input.strongestPRR * 8, strength: "Weak" },
      ],
    emerging:
      input.emerging ??
      (input.tier === "CRITICAL" || input.tier === "HIGH"
        ? [{ severity: "MEDIUM", kind: "STRONG_SIGNAL", message: `Elevated PRR for GI hemorrhage (${input.strongestPRR.toFixed(2)})` }]
        : [{ severity: "OK", kind: "OK", message: "No new signals detected in the last 12 months" }]),
    timeline:
      input.timeline ??
      [
        { date: `${input.approvalYear - 5}`, title: "Discovery", detail: "Compound synthesized.", kind: "discovery" },
        { date: `${input.approvalYear}`, title: "FDA Approval", detail: `Approved by FDA.`, kind: "approval" },
        { date: `${input.approvalYear + 1}`, title: "Market Launch", detail: `Launched as ${input.brand}.`, kind: "launch" },
        ...(input.withdrawalYear
          ? ([{ date: `${input.withdrawalYear}`, title: "Market Withdrawal", detail: "Voluntarily withdrawn.", kind: "withdrawal" }] as TimelineEvent[])
          : ([
              { date: "2019", title: "Label Update", detail: "Warning section revised.", kind: "label" },
              { date: "2024", title: "Current Status", detail: "Active — under routine surveillance.", kind: "current" },
            ] as TimelineEvent[])),
      ],
    demographics: input.demographics ?? {
      ageGroups: [
        { label: "<30", value: 8 },
        { label: "30–49", value: 22 },
        { label: "50–64", value: 30 },
        { label: "65–79", value: 28 },
        { label: "80+", value: 12 },
      ],
      genderFemalePct: 58,
      reporterTypes: [
        { label: "Physician", value: 44 },
        { label: "Consumer", value: 32 },
        { label: "Pharmacist", value: 14 },
        { label: "Other", value: 10 },
      ],
      avgAge: 58,
    },
    safetyChips: input.safetyChips ?? [
      { label: "FDA Approved", on: true },
      { label: "Black Box Warning", on: input.tier === "CRITICAL" || input.tier === "HIGH" },
      { label: "Recall History", on: !!input.withdrawalYear },
      { label: "Withdrawn", on: !!input.withdrawalYear },
      { label: "Recent Safety Alert", on: input.tier !== "LOW" },
    ],
    summary:
      input.summary ??
      `${input.generic} (${input.brand}) carries a ${input.tier} risk classification with a strongest PRR of ${input.strongestPRR.toFixed(2)} and a death rate of ${deathRatePct}% across ${totalReports.toLocaleString()} reports. ${input.status === "Withdrawn" ? `Withdrawn from market in ${input.withdrawalYear}.` : "Currently active with ongoing pharmacovigilance surveillance."} Estimated cost of harm across flagged signals is approximately $${(costOfHarmUSD / 1_000_000).toFixed(0)}M.`,
    scoreBreakdown: input.scoreBreakdown ?? {
      severity: Math.min(10, input.riskIndex / 10),
      signal: Math.min(10, input.strongestPRR * 1.6),
      volume: Math.min(10, Math.log10(totalReports) * 1.8),
    },
  };
}

const others: Drug[] = [
  makeDrug({
    id: "valdecoxib",
    generic: "Valdecoxib",
    brand: "Bextra",
    drugClass: "COX-2 Selective NSAID",
    indication: "Osteoarthritis, rheumatoid arthritis, dysmenorrhea",
    manufacturer: "Pfizer",
    approvalYear: 2001,
    withdrawalYear: 2005,
    status: "Withdrawn",
    tier: "CRITICAL",
    riskIndex: 82,
    totalReports: 48200,
    deaths: 3120,
    strongestPRR: 4.42,
  }),
  makeDrug({
    id: "lumiracoxib",
    generic: "Lumiracoxib",
    brand: "Prexige",
    drugClass: "COX-2 Selective NSAID",
    indication: "Osteoarthritis",
    manufacturer: "Novartis",
    approvalYear: 2003,
    withdrawalYear: 2007,
    status: "Withdrawn",
    tier: "CRITICAL",
    riskIndex: 78,
    totalReports: 12800,
    deaths: 610,
    strongestPRR: 3.98,
  }),
  makeDrug({
    id: "diclofenac",
    generic: "Diclofenac",
    brand: "Voltaren",
    drugClass: "Non-selective NSAID",
    indication: "Pain, arthritis, inflammation",
    manufacturer: "Novartis",
    approvalYear: 1988,
    status: "Restricted",
    tier: "HIGH",
    riskIndex: 62,
    totalReports: 88400,
    deaths: 2210,
    strongestPRR: 2.68,
  }),
  makeDrug({
    id: "ketorolac",
    generic: "Ketorolac",
    brand: "Toradol",
    drugClass: "Non-selective NSAID",
    indication: "Short-term acute pain",
    manufacturer: "Roche",
    approvalYear: 1989,
    status: "Restricted",
    tier: "HIGH",
    riskIndex: 58,
    totalReports: 34100,
    deaths: 940,
    strongestPRR: 2.42,
  }),
  makeDrug({
    id: "piroxicam",
    generic: "Piroxicam",
    brand: "Feldene",
    drugClass: "Non-selective NSAID",
    indication: "Arthritis, musculoskeletal disorders",
    manufacturer: "Pfizer",
    approvalYear: 1982,
    status: "Restricted",
    tier: "HIGH",
    riskIndex: 55,
    totalReports: 22100,
    deaths: 590,
    strongestPRR: 2.31,
  }),
  makeDrug({
    id: "nimesulide",
    generic: "Nimesulide",
    brand: "Nimesil",
    drugClass: "COX-2 Preferential NSAID",
    indication: "Acute pain, dysmenorrhea (restricted)",
    manufacturer: "Helsinn",
    approvalYear: 1985,
    status: "Restricted",
    tier: "HIGH",
    riskIndex: 51,
    totalReports: 18400,
    deaths: 410,
    strongestPRR: 2.18,
  }),
  makeDrug({
    id: "indomethacin",
    generic: "Indomethacin",
    brand: "Indocin",
    drugClass: "Non-selective NSAID",
    indication: "Rheumatoid arthritis, gout",
    manufacturer: "Merck",
    approvalYear: 1965,
    status: "Active",
    tier: "MODERATE",
    riskIndex: 44,
    totalReports: 41200,
    deaths: 640,
    strongestPRR: 1.92,
  }),
  makeDrug({
    id: "meloxicam",
    generic: "Meloxicam",
    brand: "Mobic",
    drugClass: "COX-2 Preferential NSAID",
    indication: "Osteoarthritis, rheumatoid arthritis",
    manufacturer: "Boehringer Ingelheim",
    approvalYear: 2000,
    status: "Active",
    tier: "MODERATE",
    riskIndex: 38,
    totalReports: 62400,
    deaths: 820,
    strongestPRR: 1.78,
  }),
  makeDrug({
    id: "celecoxib",
    generic: "Celecoxib",
    brand: "Celebrex",
    drugClass: "COX-2 Selective NSAID",
    indication: "Osteoarthritis, RA, ankylosing spondylitis",
    manufacturer: "Pfizer",
    approvalYear: 1998,
    status: "Active",
    tier: "MODERATE",
    riskIndex: 36,
    totalReports: 104200,
    deaths: 1240,
    strongestPRR: 1.71,
  }),
  makeDrug({
    id: "etoricoxib",
    generic: "Etoricoxib",
    brand: "Arcoxia",
    drugClass: "COX-2 Selective NSAID",
    indication: "Arthritis, acute gout, chronic pain",
    manufacturer: "Merck",
    approvalYear: 2002,
    status: "Active",
    tier: "MODERATE",
    riskIndex: 34,
    totalReports: 28100,
    deaths: 380,
    strongestPRR: 1.68,
  }),
  makeDrug({
    id: "ketoprofen",
    generic: "Ketoprofen",
    brand: "Orudis",
    drugClass: "Non-selective NSAID",
    indication: "Arthritis, pain",
    manufacturer: "Sanofi",
    approvalYear: 1986,
    status: "Active",
    tier: "MODERATE",
    riskIndex: 31,
    totalReports: 16800,
    deaths: 180,
    strongestPRR: 1.52,
  }),
  makeDrug({
    id: "sulindac",
    generic: "Sulindac",
    brand: "Clinoril",
    drugClass: "Non-selective NSAID",
    indication: "Arthritis, ankylosing spondylitis",
    manufacturer: "Merck",
    approvalYear: 1978,
    status: "Active",
    tier: "MODERATE",
    riskIndex: 28,
    totalReports: 8400,
    deaths: 92,
    strongestPRR: 1.48,
  }),
  makeDrug({
    id: "oxaprozin",
    generic: "Oxaprozin",
    brand: "Daypro",
    drugClass: "Non-selective NSAID",
    indication: "Osteoarthritis, rheumatoid arthritis",
    manufacturer: "Pfizer",
    approvalYear: 1992,
    status: "Active",
    tier: "MODERATE",
    riskIndex: 27,
    totalReports: 6200,
    deaths: 61,
    strongestPRR: 1.44,
  }),
  makeDrug({
    id: "etodolac",
    generic: "Etodolac",
    brand: "Lodine",
    drugClass: "COX-2 Preferential NSAID",
    indication: "Osteoarthritis, rheumatoid arthritis",
    manufacturer: "Wyeth",
    approvalYear: 1991,
    status: "Active",
    tier: "LOW",
    riskIndex: 22,
    totalReports: 9800,
    deaths: 84,
    strongestPRR: 1.38,
  }),
  makeDrug({
    id: "flurbiprofen",
    generic: "Flurbiprofen",
    brand: "Ansaid",
    drugClass: "Non-selective NSAID",
    indication: "Arthritis, pain",
    manufacturer: "Pfizer",
    approvalYear: 1988,
    status: "Active",
    tier: "LOW",
    riskIndex: 19,
    totalReports: 5100,
    deaths: 38,
    strongestPRR: 1.32,
  }),
  makeDrug({
    id: "mefenamic-acid",
    generic: "Mefenamic Acid",
    brand: "Ponstel",
    drugClass: "Non-selective NSAID",
    indication: "Mild-moderate pain, dysmenorrhea",
    manufacturer: "Shionogi",
    approvalYear: 1967,
    status: "Active",
    tier: "LOW",
    riskIndex: 17,
    totalReports: 4200,
    deaths: 22,
    strongestPRR: 1.24,
  }),
  makeDrug({
    id: "naproxen",
    generic: "Naproxen",
    brand: "Aleve",
    drugClass: "Non-selective NSAID",
    indication: "Pain, arthritis, dysmenorrhea",
    manufacturer: "Bayer",
    approvalYear: 1976,
    status: "Active",
    tier: "LOW",
    riskIndex: 21,
    totalReports: 118400,
    deaths: 1180,
    strongestPRR: 1.42,
  }),
  makeDrug({
    id: "ibuprofen",
    generic: "Ibuprofen",
    brand: "Advil",
    drugClass: "Non-selective NSAID",
    indication: "Pain, fever, inflammation",
    manufacturer: "Pfizer / GSK",
    approvalYear: 1974,
    status: "Active",
    tier: "LOW",
    riskIndex: 18,
    totalReports: 214200,
    deaths: 1710,
    strongestPRR: 1.28,
  }),
  makeDrug({
    id: "aspirin",
    generic: "Aspirin",
    brand: "Bayer",
    drugClass: "Non-selective NSAID / Antiplatelet",
    indication: "Pain, fever, cardiovascular prophylaxis",
    manufacturer: "Bayer",
    approvalYear: 1899,
    status: "Active",
    tier: "LOW",
    riskIndex: 20,
    totalReports: 182400,
    deaths: 1640,
    strongestPRR: 1.34,
  }),
];

export const DRUGS: Drug[] = [rofecoxib, ...others];

export const drugById = (id: string): Drug =>
  DRUGS.find((d) => d.id === id) ?? DRUGS[0];

export const tierColorClass = (tier: Tier) =>
  ({
    CRITICAL: "bg-critical text-white",
    HIGH: "bg-high text-white",
    MODERATE: "bg-moderate text-white",
    LOW: "bg-low text-white",
  })[tier];

export const tierDotClass = (tier: Tier) =>
  ({
    CRITICAL: "bg-critical",
    HIGH: "bg-high",
    MODERATE: "bg-moderate",
    LOW: "bg-low",
  })[tier];

export const tierRingClass = (tier: Tier) =>
  ({
    CRITICAL: "ring-critical/30",
    HIGH: "ring-high/30",
    MODERATE: "ring-moderate/30",
    LOW: "ring-low/30",
  })[tier];

export const timelineDotClass = (kind: TimelineEvent["kind"]) =>
  ({
    discovery: "bg-lavender",
    approval: "bg-low",
    launch: "bg-pistachio",
    signal: "bg-moderate",
    label: "bg-moderate",
    blackbox: "bg-high",
    alert: "bg-high",
    withdrawal: "bg-critical",
    generic: "bg-snow",
    current: "bg-zinc-900",
  })[kind];

export const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
};

export const formatMoney = (n: number) => {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
};
