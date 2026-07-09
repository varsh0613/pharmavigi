import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Sparkles } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RcTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DRUGS, drugById, formatNumber, formatMoney, tierColorClass, timelineDotClass } from "@/data/drugs";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare drugs — PharmaVigi" },
      { name: "description", content: "Side-by-side pharmacovigilance comparison of two NSAIDs." },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const [aId, setAId] = useState("rofecoxib");
  const [bId, setBId] = useState("celecoxib");
  const a = useMemo(() => drugById(aId), [aId]);
  const b = useMemo(() => drugById(bId), [bId]);

  const trendData = useMemo(() => {
    const years = new Set<number>();
    a.yearlyReports.forEach((y) => years.add(y.year));
    b.yearlyReports.forEach((y) => years.add(y.year));
    return Array.from(years)
      .sort()
      .map((y) => ({
        year: y,
        A: a.yearlyReports.find((r) => r.year === y)?.total ?? null,
        B: b.yearlyReports.find((r) => r.year === y)?.total ?? null,
      }));
  }, [a, b]);

  const aReactions = new Set(a.topReactions.map((r) => r.reaction));
  const bReactions = new Set(b.topReactions.map((r) => r.reaction));
  const shared = [...aReactions].filter((r) => bReactions.has(r));
  const aOnly = [...aReactions].filter((r) => !bReactions.has(r));
  const bOnly = [...bReactions].filter((r) => !aReactions.has(r));

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-7xl px-8 pt-10">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Drug Comparison</h1>

        {/* Selector row */}
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <DrugPicker label="Drug A" id={aId} onChange={setAId} bg="bg-lavender" />
          <button
            onClick={() => {
              const t = aId;
              setAId(bId);
              setBId(t);
            }}
            className="grid size-11 place-items-center rounded-full bg-foreground text-background"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <DrugPicker label="Drug B" id={bId} onChange={setBId} bg="bg-snow" />
        </div>

        {/* KPI row */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <Panel bg="bg-lavender/70">
            <PanelHead drug={a} />
          </Panel>
          <Panel bg="bg-snow">
            <PanelHead drug={b} />
          </Panel>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <Panel bg="bg-white ring-1 ring-black/5">
            <KpiGrid drug={a} other={b} />
          </Panel>
          <Panel bg="bg-white ring-1 ring-black/5">
            <KpiGrid drug={b} other={a} />
          </Panel>
        </div>

        {/* Trend */}
        <Panel bg="bg-yellow/60">
          <SectionLabel>Reporting Trend</SectionLabel>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={trendData}>
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
                />
                <Line type="monotone" dataKey="A" name={a.generic} stroke="var(--lavender)" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="B" name={b.generic} stroke="var(--critical)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Signal comparison */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Panel bg="bg-lavender/50">
            <SectionLabel>Only in {a.generic}</SectionLabel>
            <SignalList items={aOnly} />
          </Panel>
          <Panel bg="bg-pink/50">
            <SectionLabel>Shared</SectionLabel>
            <SignalList items={shared} accent />
          </Panel>
          <Panel bg="bg-snow">
            <SectionLabel>Only in {b.generic}</SectionLabel>
            <SignalList items={bOnly} />
          </Panel>
        </div>

        {/* Timelines */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Panel bg="bg-pistachio/40">
            <SectionLabel>{a.generic} Timeline</SectionLabel>
            <Timeline drug={a} />
          </Panel>
          <Panel bg="bg-rose/60">
            <SectionLabel>{b.generic} Timeline</SectionLabel>
            <Timeline drug={b} />
          </Panel>
        </div>

        {/* AI comparative summary */}
        <div className="mt-4 rounded-3xl bg-yellow p-6">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-3.5" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground/60">
              AI Comparative Summary
            </span>
          </div>
          <p className="text-sm leading-relaxed">
            Compared to {b.generic}, {a.generic} shows{" "}
            {a.deathRatePct > b.deathRatePct ? "a higher" : "a lower"} death rate
            ({a.deathRatePct}% vs {b.deathRatePct}%) and{" "}
            {a.strongestPRR > b.strongestPRR ? "a stronger" : "a weaker"} disproportionality signal
            (PRR {a.strongestPRR.toFixed(2)} vs {b.strongestPRR.toFixed(2)}). {a.generic} sits at a{" "}
            <strong>{a.tier}</strong> risk tier while {b.generic} is <strong>{b.tier}</strong>. Estimated cost
            of harm differs by {formatMoney(Math.abs(a.costOfHarmUSD - b.costOfHarmUSD))}, driven primarily by
            the difference in fatal outcomes and hospitalization volume.
          </p>
        </div>
      </div>
    </div>
  );
}

function DrugPicker({
  label,
  id,
  onChange,
  bg,
}: {
  label: string;
  id: string;
  onChange: (id: string) => void;
  bg: string;
}) {
  const drug = drugById(id);
  return (
    <div className={`rounded-3xl p-4 ${bg}`}>
      <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground/60">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={id}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold outline-none"
        >
          {DRUGS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.generic} ({d.brand})
            </option>
          ))}
        </select>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${tierColorClass(drug.tier)}`}>
          {drug.tier}
        </span>
      </div>
    </div>
  );
}

function Panel({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <section className={`rounded-3xl p-5 ${bg}`}>{children}</section>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground/60">
      {children}
    </div>
  );
}

function PanelHead({ drug }: { drug: ReturnType<typeof drugById> }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-foreground/60">
          {drug.drugClass}
        </div>
        <div className="text-2xl font-semibold tracking-tight">
          {drug.generic}{" "}
          <span className="text-sm text-foreground/60">({drug.brand})</span>
        </div>
        <div className="mt-1 text-xs text-foreground/70">
          {drug.manufacturer} · {drug.status} · approved {drug.approvalYear}
        </div>
      </div>
      <span className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${tierColorClass(drug.tier)}`}>
        {drug.tier} · {drug.riskIndex}
      </span>
    </div>
  );
}

function KpiGrid({ drug, other }: { drug: ReturnType<typeof drugById>; other: ReturnType<typeof drugById> }) {
  const rows: [string, string, boolean][] = [
    ["Total reports", formatNumber(drug.totalReports), drug.totalReports > other.totalReports],
    ["Serious", formatNumber(drug.serious), drug.serious > other.serious],
    ["Deaths", formatNumber(drug.deaths), drug.deaths > other.deaths],
    ["Death rate", `${drug.deathRatePct}%`, drug.deathRatePct > other.deathRatePct],
    ["Strongest PRR", drug.strongestPRR.toFixed(2), drug.strongestPRR > other.strongestPRR],
    ["Cost of harm", formatMoney(drug.costOfHarmUSD), drug.costOfHarmUSD > other.costOfHarmUSD],
  ];
  return (
    <div className="divide-y divide-black/5">
      {rows.map(([k, v, higher]) => (
        <div key={k} className="flex items-center justify-between py-2 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/60">{k}</span>
          <span className={`font-mono text-sm tabular-nums ${higher ? "text-critical font-semibold" : "text-foreground"}`}>
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

function SignalList({ items, accent }: { items: string[]; accent?: boolean }) {
  if (items.length === 0)
    return <div className="text-xs text-foreground/50">None</div>;
  return (
    <ul className="space-y-1.5">
      {items.map((r) => (
        <li
          key={r}
          className={`rounded-xl px-2.5 py-1.5 text-xs ${
            accent ? "bg-white/70 font-medium" : "bg-white/50"
          }`}
        >
          {r}
        </li>
      ))}
    </ul>
  );
}

function Timeline({ drug }: { drug: ReturnType<typeof drugById> }) {
  return (
    <ol className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-black/15">
      {drug.timeline.map((e, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-6 top-1 size-3 rounded-full ring-4 ring-background/70 ${timelineDotClass(e.kind)}`}
          />
          <div className="font-mono text-[9px] font-semibold uppercase tracking-widest text-foreground/60">
            {e.date}
          </div>
          <div className="text-xs font-semibold leading-tight">{e.title}</div>
        </li>
      ))}
    </ol>
  );
}
