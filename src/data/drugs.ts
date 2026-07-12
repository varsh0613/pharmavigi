// Dashboard drug types and display helpers.
// Data is loaded from static JSON files in public/results/.

export type Tier = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
export type Status = "Active" | "Withdrawn" | "Restricted";

export type TimelineEvent = {
  date: string;
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
  riskIndex: number;
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

  costOfHarmUSD: number;
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
  analysisTimestamp?: string;
};

export const drugById = (drugs: Drug[], id: string): Drug | undefined =>
  drugs.find((d) => d.id === id);

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
