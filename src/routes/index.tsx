import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  Info,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RcTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  drugById,
  formatMoney,
  formatNumber,
  timelineDotClass,
  type Drug,
} from "@/data/drugs";
import { DomeHeader } from "@/components/DomeHeader";
import { AddDrugModal } from "@/components/AddDrugModal";
import { useDrugs } from "@/hooks/use-drugs";

export const Route = createFileRoute("/")({
  component: DrugProfile,
});

type TimeWindow = "ALL" | "10Y" | "5Y" | "CURRENT";
type TrendMetric = "total" | "serious" | "deaths";

function DrugProfile() {
  const { data: drugs = [], isLoading, isError, error, refetch } = useDrugs();
  const [drugId, setDrugId] = useState<string>("rofecoxib");
  const [addOpen, setAddOpen] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("ALL");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("total");

  const drug = useMemo(() => drugById(drugs, drugId) ?? drugs[0], [drugs, drugId]);

  if (isLoading || !drug) {
    return <DashboardLoading message="Loading analysis profiles…" />;
  }

  if (isError) {
    return (
      <DashboardError
        message={error instanceof Error ? error.message : "Could not load drug profiles"}
        onRetry={refetch}
      />
    );
  }

  const outcomeData = [
    { name: "Death", value: drug.outcomes.death, color: "var(--critical)" },
    { name: "Hospitalization", value: drug.outcomes.hospitalization, color: "var(--lavender)" },
    { name: "Disability", value: drug.outcomes.disability, color: "var(--pink)" },
    { name: "Life-threatening", value: drug.outcomes.lifeThreatening, color: "var(--high)" },
    { name: "Recovered", value: drug.outcomes.recovered, color: "var(--low)" },
    { name: "Unknown", value: drug.outcomes.unknown, color: "var(--snow)" },
  ];

  const showCost = drug.tier === "CRITICAL" || drug.tier === "HIGH";
  const filteredYearlyReports = useMemo(() => {
    const startByWindow = {
      ALL: Number.NEGATIVE_INFINITY,
      "10Y": drug.latestYear - 9,
      "5Y": drug.latestYear - 4,
      CURRENT: drug.latestYear,
    } satisfies Record<TimeWindow, number>;
    return drug.yearlyReports.filter((row) => row.year >= startByWindow[timeWindow]);
  }, [drug.latestYear, drug.yearlyReports, timeWindow]);
  const windowTotals = filteredYearlyReports.reduce(
    (sum, row) => ({
      total: sum.total + row.total,
      serious: sum.serious + row.serious,
      deaths: sum.deaths + row.deaths,
    }),
    { total: 0, serious: 0, deaths: 0 },
  );
  const strongSignalCount = drug.signals.filter((signal) => signal.strength === "Strong").length;
  const topReactionShare =
    drug.totalReports > 0 ? (drug.topReactions[0]?.count ?? 0) / drug.totalReports * 100 : 0;
  const deathRatePerK = drug.totalReports > 0 ? (drug.deaths / drug.totalReports) * 1000 : 0;
  const hospitalizationRatePerK =
    drug.totalReports > 0 ? (drug.hospitalizations / drug.totalReports) * 1000 : 0;
  const prrBuckets = [
    { label: "2-5", min: 2, max: 5 },
    { label: "5-10", min: 5, max: 10 },
    { label: "10-25", min: 10, max: 25 },
    { label: "25-50", min: 25, max: 50 },
    { label: "50+", min: 50, max: Number.POSITIVE_INFINITY },
  ].map((bucket) => ({
    label: bucket.label,
    count: drug.signals.filter((signal) => signal.prr >= bucket.min && signal.prr < bucket.max).length,
  }));
  const outcomeRates = [
    { label: "Deaths", value: deathRatePerK, color: "var(--critical)" },
    { label: "Hospitalized", value: hospitalizationRatePerK, color: "var(--lavender)" },
    {
      label: "Disability",
      value: drug.totalReports > 0 ? (drug.disabilities / drug.totalReports) * 1000 : 0,
      color: "var(--pink)",
    },
    {
      label: "Life threat",
      value: drug.totalReports > 0 ? (drug.lifeThreatening / drug.totalReports) * 1000 : 0,
      color: "var(--high)",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <DomeHeader
        drug={drug}
        drugs={drugs}
        onSelect={setDrugId}
        onAddDrug={() => setAddOpen(true)}
      />

      {addOpen && (
        <AddDrugModal
          onClose={() => {
            setAddOpen(false);
          }}
          onSubmit={async (name) => {
            const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
            const match = drugs.find(
              (d) =>
                d.id === slug ||
                d.generic.toLowerCase() === name.trim().toLowerCase() ||
                d.brand.toLowerCase() === name.trim().toLowerCase(),
            );
            if (match) {
              setDrugId(match.id);
              setAddOpen(false);
            } else {
              throw new Error(
                `"${name}" is not in the local dataset. Only ${drugs.length} pre-analyzed drugs are available.`,
              );
            }
          }}
        />
      )}

      <main className="mx-auto mt-14 max-w-7xl px-8">
        <section className="mb-4 rounded-3xl bg-white p-3 ring-1 ring-black/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 rounded-full bg-black/[0.04] p-1">
              {(["ALL", "10Y", "5Y", "CURRENT"] as const).map((window) => (
                <button
                  key={window}
                  onClick={() => setTimeWindow(window)}
                  className={`rounded-full px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${
                    timeWindow === window ? "bg-foreground text-background" : "text-foreground/65"
                  }`}
                >
                  {window === "CURRENT" ? `${drug.latestYear}` : window === "ALL" ? "All years" : window}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 rounded-full bg-black/[0.04] p-1">
              {(["total", "serious", "deaths"] as const).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setTrendMetric(metric)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold capitalize ${
                    trendMetric === metric ? "bg-foreground text-background" : "text-foreground/65"
                  }`}
                >
                  {metric}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-6">
            <MiniKPI label="Window reports" value={formatNumber(windowTotals.total)} />
            <MiniKPI label="Window serious" value={formatNumber(windowTotals.serious)} />
            <MiniKPI label="Deaths / 1k" value={deathRatePerK.toFixed(2)} danger />
            <MiniKPI label="Hosp. / 1k" value={hospitalizationRatePerK.toFixed(2)} />
            <MiniKPI label="Strong signals" value={String(strongSignalCount)} danger={strongSignalCount > 0} />
            <MiniKPI label="Top reaction share" value={`${topReactionShare.toFixed(2)}%`} />
          </div>
        </section>

        {/* Row 1: Summary + KPIs + Timeline */}
        <div className="grid grid-cols-12 gap-4">
          {/* LEFT: AI Summary + KPIs + Cost */}
          <div className="col-span-12 space-y-4 lg:col-span-3">
            <Card bg="bg-yellow" label="Clinical Summary" icon={<Sparkles className="size-3.5" />}>
              <p className="text-sm leading-relaxed text-foreground/85">
                {drug.summary}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/50">
                  {drug.analysisTimestamp
                    ? `Analysis · ${new Date(drug.analysisTimestamp).toLocaleDateString()}`
                    : "Live analysis"}
                </span>
                <button className="rounded-full bg-black/10 px-2.5 py-1 text-[10px] font-medium hover:bg-black/15">
                  Regenerate
                </button>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <KPI label="Serious" value={formatNumber(drug.serious)} bg="bg-rose" />
              <KPI label="Deaths" value={formatNumber(drug.deaths)} bg="bg-lavender" accent="text-critical" />
              <KPI label="Hosp." value={formatNumber(drug.hospitalizations)} bg="bg-snow" />
              <KPI label="Disability" value={formatNumber(drug.disabilities)} bg="bg-pink" />
            </div>

            {showCost && (
              <Card bg="bg-pistachio/50" label="Estimated Cost of Harm">
                <div className="text-3xl font-semibold tracking-tight text-critical">
                  {formatMoney(drug.costOfHarmUSD)}
                </div>
                <div className="mt-3 space-y-1.5 font-mono text-[10px] text-foreground/70">
                  <Row k="Deaths" v={formatMoney(drug.costBreakdown.deaths)} />
                  <Row k="Hospitalizations" v={formatMoney(drug.costBreakdown.hosp)} />
                  <Row k="Disabilities" v={formatMoney(drug.costBreakdown.disability)} />
                </div>
                <p className="mt-3 text-[10px] leading-snug text-foreground/50">
                  Modeled estimate. Benchmarks: $500K per death, $15K per hosp., $200K per disability. Not audited.
                </p>
              </Card>
            )}

            <Card bg="bg-white ring-1 ring-black/5" label="Quick Safety Indicators">
              <div className="flex flex-wrap gap-1.5">
                {drug.safetyChips.map((c) => (
                  <span
                    key={c.label}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      c.on
                        ? "bg-critical/10 text-critical"
                        : "bg-black/[0.04] text-muted-foreground line-through"
                    }`}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            </Card>
          </div>

           {/* CENTER: Trend + Signals + Class comparison */}
           <div className="col-span-12 space-y-4 lg:col-span-9">
             {/* Trend */}
             <Card bg="bg-snow" label="Adverse Event Trend">
               <div className="mb-2 flex items-center justify-between">
                 <div>
                   <div className="text-sm font-semibold">
                     Reports by year · {drug.yearlyReports[0]?.year ?? "—"}–{drug.latestYear}
                   </div>
                   <div className="mt-0.5 text-xs text-foreground/60">
                     {drug.withdrawalYear
                       ? `Withdrawal marker at ${drug.withdrawalYear}`
                       : "Currently under active surveillance"}
                   </div>
                 </div>
                 <div className="flex gap-1 rounded-full bg-white/50 p-1 text-[10px] font-medium">
                   <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">Total</span>
                   <span className="rounded-full px-2.5 py-1 text-foreground/60">Serious</span>
                   <span className="rounded-full px-2.5 py-1 text-foreground/60">Deaths</span>
                 </div>
               </div>
               <div className="h-56 w-full">
                 <ResponsiveContainer>
                   <AreaChart data={filteredYearlyReports}>
                     <defs>
                       <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="var(--critical)" stopOpacity={0.35} />
                         <stop offset="100%" stopColor="var(--critical)" stopOpacity={0} />
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.08)" vertical={false} />
                     <XAxis
                       dataKey="year"
                       tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                       axisLine={false}
                       tickLine={false}
                     />
                     <YAxis
                       tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                       axisLine={false}
                       tickLine={false}
                       tickFormatter={(v) => formatNumber(v as number)}
                     />
                     <RcTooltip
                       contentStyle={{
                         borderRadius: 12,
                         border: "none",
                         boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                         fontFamily: "var(--font-mono)",
                         fontSize: 11,
                       }}
                       formatter={(v: number) => formatNumber(v)}
                     />
                     <Area
                       type="monotone"
                       dataKey={trendMetric}
                       stroke="var(--critical)"
                       strokeWidth={2.5}
                       fill="url(#trendFill)"
                     />
                     {trendMetric === "total" && (
                       <>
                         <Line type="monotone" dataKey="serious" stroke="var(--high)" strokeWidth={1.8} dot={false} />
                         <Line type="monotone" dataKey="deaths" stroke="var(--foreground)" strokeWidth={1.6} dot={false} />
                       </>
                     )}
                     {drug.withdrawalYear && (
                       <ReferenceLine
                         x={drug.withdrawalYear}
                         stroke="var(--critical)"
                         strokeDasharray="4 4"
                         label={{
                           value: "Withdrawal",
                           position: "top",
                           fill: "var(--critical)",
                           fontSize: 10,
                           fontFamily: "var(--font-mono)",
                         }}
                       />
                     )}
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </Card>

             {/* Signal Detection Table */}
            <Card bg="bg-white ring-1 ring-black/5" label="Signal Detection · PRR / ROR / χ²">
              <div className="max-h-40 overflow-y-auto rounded-2xl">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-black/[0.03]">
                    <tr className="font-mono text-[9px] font-semibold uppercase tracking-widest text-foreground/60">
                      <th className="px-3 py-1.5">Reaction</th>
                      <th className="px-2 py-1.5">Reports</th>
                      <th className="px-2 py-1.5">
                        <Tip label="PRR" tip="Proportional Reporting Ratio — how much more often this reaction appears for this drug vs. all others in class. Threshold ≥ 2." />
                      </th>
                      <th className="px-2 py-1.5">
                        <Tip label="ROR" tip="Reporting Odds Ratio — statistical odds. Threshold ≥ 2." />
                      </th>
                      <th className="px-2 py-1.5">
                        <Tip label="χ²" tip="Chi-square significance. Threshold ≥ 4." />
                      </th>
                      <th className="px-3 py-1.5 text-right">Strength</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {drug.signals.map((s) => (
                      <tr key={s.reaction} className={s.strength === "Strong" ? "bg-critical/[0.04]" : ""}>
                        <td className="px-3 py-1.5 text-xs font-medium">{s.reaction}</td>
                        <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">
                          {formatNumber(s.reports)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">
                          {s.prr.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">
                          {s.ror.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">
                          {s.chi2.toFixed(1)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <StrengthBadge strength={s.strength} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

             {/* Class comparison callouts */}
             <Card bg="bg-white ring-1 ring-black/5" label="vs. NSAID Class Average">
               <div className="grid grid-cols-3 gap-3">
                 <Callout
                   label="Death rate"
                   value={`${drug.deathRatePct.toFixed(2)}%`}
                   bench={`class ${drug.classAvgDeathRatePct.toFixed(2)}%`}
                   danger={drug.deathRatePct > drug.classAvgDeathRatePct}
                 />
                 <Callout
                   label="Serious rate"
                   value={`${drug.seriousRatePct.toFixed(2)}%`}
                   bench={`class ${drug.classAvgSeriousRatePct.toFixed(2)}%`}
                   danger={drug.seriousRatePct > drug.classAvgSeriousRatePct}
                 />
                 <Callout
                   label="Strongest PRR"
                   value={drug.strongestPRR.toFixed(2)}
                   bench={`class ${drug.classAvgPRR.toFixed(2)}`}
                   danger={drug.strongestPRR > 2}
                 />
               </div>
             </Card>
           </div>

           {/* RIGHT: Timeline + Alerts + Demographics */}
           <div className="col-span-12 grid gap-4 lg:grid-cols-4">
        <Card bg="bg-pink/60" label="Regulatory Timeline">
              <ol className="relative space-y-6 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-black/15">
                {drug.timeline.map((e, i) => (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-6 top-1 size-3.5 rounded-full ring-4 ring-pink/60 ${timelineDotClass(
                        e.kind,
                      )}`}
                    />
                    <div className="font-mono text-[9px] font-semibold uppercase tracking-widest text-foreground/60">
                      {e.date}
                    </div>
                    <div className="text-sm font-semibold leading-tight">
                      {e.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-foreground/70">
                      {e.detail}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>

            <Card
              bg="bg-critical/[0.06] ring-1 ring-critical/20"
              label="Emerging Signals"
              className="h-full min-h-[520px]"
              contentClassName="min-h-0 flex-1"
            >
              <ul className="h-full space-y-2 overflow-y-auto pr-1">
                {drug.emerging.map((e, i) => (
                  <li
                    key={i}
                    className="rounded-2xl bg-white/70 p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`grid size-4 place-items-center rounded-full ${
                          e.severity === "OK" ? "bg-low/20 text-low" : "bg-critical/15 text-critical"
                        }`}
                      >
                        {e.severity === "OK" ? (
                          <TrendingUp className="size-2.5" />
                        ) : (
                          <AlertTriangle className="size-2.5" />
                        )}
                      </span>
                      <span
                        className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
                          e.severity === "HIGH"
                            ? "text-critical"
                            : e.severity === "MEDIUM"
                            ? "text-high"
                            : e.severity === "LOW"
                            ? "text-moderate"
                            : "text-low"
                        }`}
                      >
                        {e.severity} · {e.kind.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-foreground/85">
                      {formatSignalMessage(e.message)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card bg="bg-lavender/60" label="Demographics">
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-foreground/60">
                    <span>Age groups</span>
                    <span>avg {drug.demographics.avgAge}y</span>
                  </div>
                  <div className="flex items-end gap-1">
                    {drug.demographics.ageGroups.map((g) => (
                      <div key={g.label} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex h-16 w-full items-end">
                          <div
                            className="w-full rounded-t-md bg-foreground/80"
                            style={{ height: `${g.value * 2.2}%` }}
                          />
                        </div>
                        <div className="font-mono text-[9px] text-foreground/60">
                          {g.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/70 p-2">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-foreground/60">
                      Female
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      {drug.demographics.genderFemalePct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/70 p-2">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-foreground/60">
                      Male
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      {(100 - drug.demographics.genderFemalePct).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-foreground/60">
                    Reporter type
                  </div>
                  <div className="space-y-1">
                    {drug.demographics.reporterTypes.map((r) => (
                      <div key={r.label} className="flex items-center gap-2 text-[11px]">
                        <span className="w-16 shrink-0 text-foreground/70">
                          {r.label}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/60">
                          <div
                            className="h-full bg-foreground/70"
                            style={{ width: `${r.value * 2}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono tabular-nums">
                          {r.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card bg="bg-yellow/70" label="Risk Score Breakdown">
              <div className="space-y-2.5">
                <ScoreBar label="Severity" value={drug.scoreBreakdown.severity} />
                <ScoreBar label="Signal" value={drug.scoreBreakdown.signal} />
                <ScoreBar label="Volume" value={drug.scoreBreakdown.volume} />
                <div className="pt-2">
                  <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-foreground/60">
                    Risk Index
                  </div>
                  <div className="relative h-2 rounded-full bg-white/70">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-critical"
                      style={{ width: `${drug.riskIndex}%` }}
                    />
                    {[25, 50, 75].map((t) => (
                      <div
                        key={t}
                        className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-foreground/30"
                        style={{ left: `${t}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between font-mono text-[9px] text-foreground/60">
                    <span>Low</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>Critical</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Charts row — below all columns, fits end-to-end */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card bg="bg-lavender" label="Top Adverse Reactions">
            <div className="h-44 w-full">
              <ResponsiveContainer>
                <BarChart
                  data={drug.topReactions.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 10, right: 12, top: 4, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    hide
                    domain={[0, "dataMax"]}
                  />
                  <YAxis
                    type="category"
                    dataKey="reaction"
                    width={110}
                    tick={{ fontSize: 9, fill: "rgba(0,0,0,0.75)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RcTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                    }}
                    formatter={(v: number) => formatNumber(v)}
                  />
                  <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                    {drug.topReactions.slice(0, 8).map((r, i) => (
                      <Cell
                        key={i}
                        fill={r.isSignal ? "var(--critical)" : "rgba(0,0,0,0.35)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card bg="bg-pistachio" label="Outcome Distribution">
            <div className="grid min-h-44 grid-cols-1 items-center gap-4 sm:grid-cols-[170px_1fr]">
              <div className="h-36 w-36 justify-self-center">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      strokeWidth={2}
                      stroke="var(--pistachio)"
                    >
                      {outcomeData.map((o) => (
                        <Cell key={o.name} fill={o.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {outcomeData.map((o) => (
                  <div key={o.name} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: o.color }}
                      />
                      <span className="text-foreground/80">{o.name}</span>
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatNumber(o.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card bg="bg-white ring-1 ring-black/5" label="PRR Distribution">
            <div className="h-44 w-full">
              <ResponsiveContainer>
                <BarChart data={prrBuckets} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                  <RcTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--critical)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card bg="bg-snow" label="Outcome Rates / 1k Reports">
            <div className="space-y-3">
              {outcomeRates.map((rate) => (
                <div key={rate.label}>
                  <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-foreground/60">
                    <span>{rate.label}</span>
                    <span>{rate.value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/70">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(rate.value, 100)}%`, background: rate.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card bg="bg-white ring-1 ring-black/5" label="Signal Watchlist">
            <div className="max-h-44 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white">
                  <tr className="font-mono text-[9px] uppercase tracking-widest text-foreground/50">
                    <th className="py-1 pr-2">Reaction</th>
                    <th className="px-2 py-1 text-right">PRR</th>
                    <th className="px-2 py-1 text-right">ROR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {drug.signals.slice(0, 8).map((signal) => (
                    <tr key={signal.reaction}>
                      <td className="py-1.5 pr-2 text-xs font-medium">{signal.reaction}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px]">{signal.prr.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px]">{signal.ror.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 ring-1 ring-black/5">
          <div className="text-xs text-foreground/60">
            Data: openFDA · FAERS 2004–{drug.latestYear} · sample n={formatNumber(drug.totalReports)}
          </div>
          <div className="flex gap-2">
            <Link
              to="/compare"
              className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 text-xs font-medium hover:bg-black/10"
            >
              Compare drug <ArrowUpRight className="size-3.5" />
            </Link>
            <button className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Download className="size-3.5" />
              Export to Excel
            </button>
          </div>
        </div>

        <div className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {drugs.length} drugs loaded · {drugs.filter((d) => d.tier === "CRITICAL").length} critical ·{" "}
          {drugs.filter((d) => d.tier === "HIGH").length} high ·{" "}
          {drugs.filter((d) => d.tier === "MODERATE").length} moderate ·{" "}
          {drugs.filter((d) => d.tier === "LOW").length} low
        </div>
      </main>
    </div>
  );
}

// ---------- Reusable pieces ----------

function DashboardLoading({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="font-mono text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="max-w-md text-sm text-foreground/80">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
      >
        Retry
      </button>
    </div>
  );
}

function Card({
  bg,
  label,
  children,
  icon,
  className = "",
  contentClassName = "",
}: {
  bg: string;
  label?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={`flex flex-col rounded-3xl p-4 ${bg} ${className}`}>
      {label && (
        <div className="mb-3 flex shrink-0 items-center gap-1.5">
          {icon}
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground/60">
            {label}
          </h3>
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

function MiniKPI({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-2xl bg-black/[0.03] px-3 py-2">
      <div className="font-mono text-[9px] font-semibold uppercase tracking-widest text-foreground/50">
        {label}
      </div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${danger ? "text-critical" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function KPI({ label, value, bg, accent }: { label: string; value: string; bg: string; accent?: string }) {
  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <div className="font-mono text-[9px] font-semibold uppercase tracking-widest text-foreground/60">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${accent ?? ""}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="uppercase tracking-widest text-foreground/50">{k}</span>
      <span className="tabular-nums text-foreground/80">{v}</span>
    </div>
  );
}

function StrengthBadge({ strength }: { strength: "Strong" | "Moderate" | "Weak" | "None" }) {
  const map = {
    Strong: "bg-critical text-white",
    Moderate: "bg-high text-white",
    Weak: "bg-moderate/70 text-white",
    None: "bg-black/[0.06] text-foreground/50",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${map[strength]}`}>
      {strength}
    </span>
  );
}

function Callout({
  label,
  value,
  bench,
  danger,
}: {
  label: string;
  value: string;
  bench: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-black/[0.03] p-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-foreground/60">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${danger ? "text-critical" : ""}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-foreground/60">{bench}</div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-foreground/60">
        <span>{label}</span>
        <span className="tabular-nums">{value.toFixed(2)}/10</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/70">
        <div className="h-full bg-foreground/80" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

function formatSignalMessage(message: string) {
  return message.replace(/PRR=([0-9]+(?:\.[0-9]+)?)/g, (_, value: string) => `PRR=${Number(value).toFixed(2)}`);
}

function Tip({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="group relative inline-flex cursor-help items-center gap-1">
      {label}
      <Info className="size-2.5 text-foreground/40" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-44 -translate-x-1/2 rounded-lg bg-foreground p-2 text-[10px] font-normal normal-case leading-snug tracking-normal text-background shadow-lg group-hover:block">
        {tip}
      </span>
    </span>
  );
}
