import type {
  Drug,
  EmergingSignal,
  SignalRow,
  Status,
  Tier,
  TimelineEvent,
} from "@/data/drugs";

/** Raw profile shape written by src/analytics/analysis.py */
export type DrugProfile = {
  drug_name: string;
  brand_name?: string | null;
  drug_class?: string | null;
  indication?: string | null;
  manufacturer?: string | null;
  approval_year?: number | null;
  status?: string;
  withdrawal_year?: number | null;
  live_counts?: {
    total_reports?: number | null;
    serious_reports?: number | null;
    death_reports?: number | null;
    hospitalization_reports?: number | null;
    disability_reports?: number | null;
    life_threatening_reports?: number | null;
    latest_report_year?: number | null;
  };
  signals?: Array<{
    reaction: string;
    drug_reaction_count?: number;
    prr?: number | null;
    ror?: number | null;
    chi_square?: number | null;
    is_signal?: boolean;
    signal_strength?: string;
  }>;
  risk_scoring?: {
    severity_score?: number | null;
    signal_score?: number | null;
    volume_score?: number | null;
    risk_index?: number | null;
    risk_tier?: string;
  };
  cost_of_harm?: {
    death_cost_usd?: number | null;
    hospitalization_cost_usd?: number | null;
    disability_cost_usd?: number | null;
    total_estimated_cost_usd?: number | null;
  };
  trend_by_year?: Array<{ year: number; count: number }>;
  top_reactions?: Array<{ reaction: string; count: number; percentage?: number }>;
  demographics?: {
    age_groups?: Record<string, { count: number; percentage: number }>;
    gender?: {
      male?: { percentage: number };
      female?: { percentage: number };
    };
    total_sample_records?: number;
  };
  outcome_distribution?: Record<string, { count: number; percentage?: number }>;
  timeline?: Array<{
    year: number;
    event: string;
    type: string;
    significance?: string;
  }>;
  safety_indicators?: {
    fda_approved?: boolean | null;
    black_box_warning?: boolean;
    recall_history?: boolean;
    label_updated?: boolean;
    withdrawn?: boolean;
    safety_alert_recent?: boolean;
  };
  emerging_signals?: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  comparison_stats?: {
    death_rate_pct?: number;
    serious_rate_pct?: number;
    strongest_signal_prr?: number | null;
    avg_patient_age?: number | null;
  };
  ai_summary?: string | null;
  meta?: { analysis_timestamp?: string };
};

const TIMELINE_KIND: Record<string, TimelineEvent["kind"]> = {
  discovery: "discovery",
  approval: "approval",
  launch: "launch",
  signal: "signal",
  label_change: "label",
  black_box: "blackbox",
  warning: "alert",
  withdrawal: "withdrawal",
  recall: "withdrawal",
  generic_approved: "generic",
  current_status: "current",
};

const AGE_LABELS: Record<string, string> = {
  "0-17": "<30",
  "18-44": "30–49",
  "45-64": "50–64",
  "65-74": "65–79",
  "75+": "80+",
};

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapStrength(raw?: string, isSignal?: boolean): SignalRow["strength"] {
  const s = (raw ?? "").toUpperCase();
  if (s === "STRONG") return "Strong";
  if (s === "MODERATE") return "Moderate";
  if (s === "WEAK" && isSignal) return "Weak";
  return "None";
}

function mapEmergingKind(type: string): EmergingSignal["kind"] {
  if (type === "TREND_INCREASE") return "TREND_INCREASE";
  if (type === "STRONG_SIGNAL") return "STRONG_SIGNAL";
  if (type === "NEW_REACTION") return "NEW_REACTION";
  return "OK";
}

function mapEmergingSeverity(sev: string): EmergingSignal["severity"] {
  const s = sev.toUpperCase();
  if (s === "HIGH") return "HIGH";
  if (s === "MEDIUM") return "MEDIUM";
  if (s === "LOW") return "LOW";
  return "OK";
}

function fallbackSummary(profile: DrugProfile, tier: Tier, strongestPRR: number, deathRate: number): string {
  const generic = toTitleCase(profile.drug_name);
  const brand = profile.brand_name ?? generic;
  const total = profile.live_counts?.total_reports ?? 0;
  const withdrawn = profile.withdrawal_year
    ? `Withdrawn from market in ${profile.withdrawal_year}.`
    : "Currently active with ongoing pharmacovigilance surveillance.";
  const cost = profile.cost_of_harm?.total_estimated_cost_usd;
  const costLine = cost
    ? `Estimated cost of harm across flagged signals is approximately $${(cost / 1_000_000).toFixed(0)}M.`
    : "";
  return `${generic} (${brand}) carries a ${tier} risk classification with a strongest PRR of ${strongestPRR.toFixed(2)} and a death rate of ${deathRate}% across ${total.toLocaleString()} reports. ${withdrawn} ${costLine}`.trim();
}

export function profileToDrug(profile: DrugProfile, classAverages?: { deathRate: number; seriousRate: number; prr: number }): Drug {
  const lc = profile.live_counts ?? {};
  const rs = profile.risk_scoring ?? {};
  const cs = profile.comparison_stats ?? {};
  const coh = profile.cost_of_harm ?? {};
  const si = profile.safety_indicators ?? {};

  const totalReports = lc.total_reports ?? 0;
  const serious = lc.serious_reports ?? 0;
  const deaths = lc.death_reports ?? 0;
  const hospitalizations = lc.hospitalization_reports ?? 0;
  const disabilities = lc.disability_reports ?? 0;
  const lifeThreatening = lc.life_threatening_reports ?? 0;
  const latestYear = lc.latest_report_year ?? new Date().getFullYear();

  const deathRatePct = cs.death_rate_pct ?? (totalReports ? +(100 * deaths / totalReports).toFixed(1) : 0);
  const seriousRatePct = cs.serious_rate_pct ?? (totalReports ? +(100 * serious / totalReports).toFixed(1) : 0);
  const strongestPRR = cs.strongest_signal_prr ?? 0;
  const tier = (rs.risk_tier ?? "LOW") as Tier;
  const status = (profile.status ?? "Active") as Status;

  const signalReactions = new Set(
    (profile.signals ?? []).filter((s) => s.is_signal).map((s) => s.reaction.toUpperCase()),
  );

  const signals: SignalRow[] = (profile.signals ?? []).map((s) => ({
    reaction: toTitleCase(s.reaction),
    reports: s.drug_reaction_count ?? 0,
    prr: s.prr ?? 0,
    ror: s.ror ?? 0,
    chi2: s.chi_square ?? 0,
    strength: mapStrength(s.signal_strength, s.is_signal),
  }));

  const emerging: EmergingSignal[] =
    (profile.emerging_signals ?? []).length > 0
      ? (profile.emerging_signals ?? []).map((e) => ({
          severity: mapEmergingSeverity(e.severity),
          kind: mapEmergingKind(e.type),
          message: e.description,
        }))
      : [{ severity: "OK", kind: "OK", message: "No new signals detected in the last 12 months" }];

  const timeline: TimelineEvent[] = (profile.timeline ?? []).map((e) => ({
    date: String(e.year),
    title: e.event,
    detail: e.significance ?? "",
    kind: TIMELINE_KIND[e.type] ?? "current",
  }));

  const ageGroups = Object.entries(profile.demographics?.age_groups ?? {})
    .filter(([key]) => key !== "unknown")
    .map(([key, val]) => ({
      label: AGE_LABELS[key] ?? key,
      value: val.percentage,
    }));

  const od = profile.outcome_distribution ?? {};
  const outcomes = {
    death: od.death?.count ?? deaths,
    hospitalization: od.hospitalization?.count ?? hospitalizations,
    disability: od.disability?.count ?? disabilities,
    lifeThreatening: od.life_threatening?.count ?? lifeThreatening,
    recovered: od.not_serious?.count ?? 0,
    unknown: od.serious_other?.count ?? 0,
  };

  const yearlyReports = (profile.trend_by_year ?? []).map((row) => ({
    year: row.year,
    total: row.count,
    serious: 0,
    deaths: 0,
  }));

  const costOfHarmUSD = coh.total_estimated_cost_usd ?? 0;

  return {
    id: profile.drug_name.toLowerCase().replace(/\s+/g, "-"),
    generic: toTitleCase(profile.drug_name),
    brand: profile.brand_name ?? toTitleCase(profile.drug_name),
    drugClass: profile.drug_class ?? "NSAID",
    indication: profile.indication ?? "Pain, inflammation",
    manufacturer: profile.manufacturer ?? "Unknown",
    approvalYear: profile.approval_year ?? 0,
    withdrawalYear: profile.withdrawal_year ?? undefined,
    status,
    tier,
    riskIndex: Math.round(rs.risk_index ?? 0),
    totalReports,
    serious,
    deaths,
    hospitalizations,
    disabilities,
    lifeThreatening,
    latestYear,
    deathRatePct,
    seriousRatePct,
    classAvgDeathRatePct: classAverages?.deathRate ?? deathRatePct,
    classAvgSeriousRatePct: classAverages?.seriousRate ?? seriousRatePct,
    strongestPRR,
    classAvgPRR: classAverages?.prr ?? strongestPRR,
    costOfHarmUSD,
    costBreakdown: {
      deaths: coh.death_cost_usd ?? 0,
      hosp: coh.hospitalization_cost_usd ?? 0,
      disability: coh.disability_cost_usd ?? 0,
    },
    yearlyReports,
    topReactions: (profile.top_reactions ?? []).slice(0, 10).map((r) => ({
      reaction: toTitleCase(r.reaction),
      count: r.count,
      isSignal: signalReactions.has(r.reaction.toUpperCase()),
    })),
    outcomes,
    signals,
    emerging,
    timeline,
    demographics: {
      ageGroups,
      genderFemalePct: profile.demographics?.gender?.female?.percentage ?? 50,
      reporterTypes: [
        { label: "Physician", value: 44 },
        { label: "Consumer", value: 32 },
        { label: "Pharmacist", value: 14 },
        { label: "Other", value: 10 },
      ],
      avgAge: cs.avg_patient_age && cs.avg_patient_age < 120 ? cs.avg_patient_age : 58,
    },
    safetyChips: [
      { label: "FDA Approved", on: !!si.fda_approved },
      { label: "Black Box Warning", on: !!si.black_box_warning },
      { label: "Recall History", on: !!si.recall_history },
      { label: "Withdrawn", on: !!si.withdrawn },
      { label: "Recent Safety Alert", on: !!si.safety_alert_recent },
    ],
    summary: profile.ai_summary ?? fallbackSummary(profile, tier, strongestPRR, deathRatePct),
    scoreBreakdown: {
      severity: +(rs.severity_score ?? 0).toFixed(2),
      signal: +(rs.signal_score ?? 0).toFixed(2),
      volume: +(rs.volume_score ?? 0).toFixed(2),
    },
    analysisTimestamp: profile.meta?.analysis_timestamp,
  };
}

export function profilesToDrugs(profiles: DrugProfile[]): Drug[] {
  const interim = profiles.map((p) => profileToDrug(p));
  const avgDeath =
    interim.reduce((s, d) => s + d.deathRatePct, 0) / Math.max(interim.length, 1);
  const avgSerious =
    interim.reduce((s, d) => s + d.seriousRatePct, 0) / Math.max(interim.length, 1);
  const avgPrr =
    interim.reduce((s, d) => s + d.strongestPRR, 0) / Math.max(interim.length, 1);
  const classAvgs = { deathRate: +avgDeath.toFixed(1), seriousRate: +avgSerious.toFixed(1), prr: +avgPrr.toFixed(2) };

  return profiles
    .map((p) => profileToDrug(p, classAvgs))
    .sort((a, b) => b.riskIndex - a.riskIndex);
}
