import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Label,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RcTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  DRUGS,
  formatMoney,
  formatNumber,
  tierColorClass,
  type Drug,
  type Tier,
} from "@/data/drugs";

export const Route = createFileRoute("/class")({
  head: () => ({
    meta: [
      { title: "NSAID Class Overview — PharmaVigi" },
      { name: "description", content: "Ranked risk leaderboard for all 19 NSAIDs with signal vs. mortality scatter." },
    ],
  }),
  component: ClassPage,
});

const TIER_COLOR: Record<Tier, string> = {
  CRITICAL: "var(--critical)",
  HIGH: "var(--high)",
  MODERATE: "var(--moderate)",
  LOW: "var(--low)",
};

function ClassPage() {
  const [tierFilter, setTierFilter] = useState<Tier | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"riskIndex" | "totalReports" | "deathRatePct" | "strongestPRR" | "costOfHarmUSD">(
    "riskIndex",
  );

  const filtered = useMemo(() => {
    let list = [...DRUGS];
    if (tierFilter !== "ALL") list = list.filter((d) => d.tier === tierFilter);
    list.sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));
    return list;
  }, [tierFilter, sortBy]);

  const scatterData = DRUGS.map((d) => ({
    x: d.strongestPRR,
    y: d.deathRatePct,
    z: Math.log10(d.totalReports),
    name: d.generic,
    tier: d.tier,
  }));

  const totals = {
    reports: DRUGS.reduce((s, d) => s + d.totalReports, 0),
    deaths: DRUGS.reduce((s, d) => s + d.deaths, 0),
    critical: DRUGS.filter((d) => d.tier === "CRITICAL").length,
    high: DRUGS.filter((d) => d.tier === "HIGH").length,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-7xl px-8 pt-10">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">NSAID Class Overview</h1>
        <p className="mb-6 max-w-2xl text-sm text-foreground/70">
          All 19 pre-loaded NSAIDs ranked by Risk Index. Rofecoxib and Valdecoxib — both real market
          withdrawals — appear in the top-right danger zone, validating the methodology against known outcomes.
        </p>

        {/* Class summary */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SumKpi bg="bg-lavender" label="Total reports" value={formatNumber(totals.reports)} />
          <SumKpi bg="bg-rose" label="Total deaths" value={formatNumber(totals.deaths)} />
          <SumKpi bg="bg-critical text-white" label="Critical drugs" value={String(totals.critical)} labelColor="text-white/70" />
          <SumKpi bg="bg-high text-white" label="High-risk drugs" value={String(totals.high)} labelColor="text-white/70" />
        </div>

        {/* Scatter */}
        <section className="mb-6 rounded-3xl bg-snow p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground/60">
                Risk Scatter
              </div>
              <div className="text-lg font-semibold tracking-tight">
                Signal strength × mortality
              </div>
              <div className="text-xs text-foreground/60">
                X: strongest PRR · Y: death rate % · bubble size: report volume (log)
              </div>
            </div>
            <div className="flex gap-2 text-[10px] font-medium">
              {(["CRITICAL", "HIGH", "MODERATE", "LOW"] as Tier[]).map((t) => (
                <span key={t} className="flex items-center gap-1.5 font-mono uppercase tracking-widest">
                  <span className="size-2 rounded-full" style={{ background: TIER_COLOR[t] }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 20, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.08)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="PRR"
                  domain={[0.8, 6]}
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                >
                  <Label value="Strongest PRR →" offset={-20} position="insideBottom" style={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "rgba(0,0,0,0.5)" }} />
                </XAxis>
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Death rate %"
                  domain={[0, 10]}
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                >
                  <Label value="Death rate % →" angle={-90} position="insideLeft" style={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "rgba(0,0,0,0.5)", textAnchor: "middle" }} />
                </YAxis>
                <ZAxis type="number" dataKey="z" range={[80, 900]} />
                <RcTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                  formatter={(v: number, k: string) => {
                    if (k === "z") return null as unknown as string;
                    return v.toFixed(2);
                  }}
                  labelFormatter={(_, payload) => (payload?.[0]?.payload?.name ?? "") as string}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((p, i) => (
                    <Cell key={i} fill={TIER_COLOR[p.tier]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-foreground/50">
            Top-right = withdrawal zone · Rofecoxib · Valdecoxib
          </div>
        </section>

        {/* Filter bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full bg-black/[0.04] p-1">
            {(["ALL", "CRITICAL", "HIGH", "MODERATE", "LOW"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${
                  tierFilter === t ? "bg-foreground text-background" : "text-foreground/70"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-widest text-muted-foreground">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-full bg-black/[0.05] px-3 py-1.5 text-xs outline-none"
            >
              <option value="riskIndex">Risk Index</option>
              <option value="totalReports">Total Reports</option>
              <option value="deathRatePct">Death Rate</option>
              <option value="strongestPRR">Strongest PRR</option>
              <option value="costOfHarmUSD">Cost of Harm</option>
            </select>
          </div>
        </div>

        {/* Leaderboard */}
        <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-black/[0.03]">
              <tr className="font-mono text-[9px] font-semibold uppercase tracking-widest text-foreground/60">
                <th className="px-4 py-3">Drug</th>
                <th className="px-3 py-3">Brand</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Tier</th>
                <th className="px-3 py-3">Risk Idx</th>
                <th className="px-3 py-3">Death %</th>
                <th className="px-3 py-3">Top signal</th>
                <th className="px-3 py-3">PRR</th>
                <th className="px-3 py-3">Cost of harm</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((d) => (
                <LeaderRow key={d.id} drug={d} />
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function LeaderRow({ drug }: { drug: Drug }) {
  const topSignal = drug.signals.reduce((a, b) => (b.prr > a.prr ? b : a));
  return (
    <tr className="transition-colors hover:bg-black/[0.02]">
      <td className="px-4 py-3 font-medium">{drug.generic}</td>
      <td className="px-3 py-3 text-foreground/70">{drug.brand}</td>
      <td className="px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/70">
        {drug.status}
      </td>
      <td className="px-3 py-3">
        <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${tierColorClass(drug.tier)}`}>
          {drug.tier}
        </span>
      </td>
      <td className="px-3 py-3 font-mono tabular-nums">{drug.riskIndex}</td>
      <td className="px-3 py-3 font-mono tabular-nums">{drug.deathRatePct}%</td>
      <td className="px-3 py-3 text-xs text-foreground/80">{topSignal.reaction}</td>
      <td className="px-3 py-3 font-mono tabular-nums">{drug.strongestPRR.toFixed(2)}</td>
      <td className="px-3 py-3 font-mono tabular-nums">{formatMoney(drug.costOfHarmUSD)}</td>
      <td className="px-4 py-3 text-right">
        <Link
          to="/"
          className="rounded-full bg-black/[0.05] px-3 py-1 text-[10px] font-semibold hover:bg-black/10"
        >
          View →
        </Link>
      </td>
    </tr>
  );
}

function SumKpi({ bg, label, value, labelColor }: { bg: string; label: string; value: string; labelColor?: string }) {
  return (
    <div className={`rounded-3xl p-5 ${bg}`}>
      <div className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${labelColor ?? "text-foreground/60"}`}>
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}



