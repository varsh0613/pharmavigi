import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useDrugs } from "@/hooks/use-drugs";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Methodology — PharmaVigi" },
      { name: "description", content: "How PharmaVigi computes PRR, ROR, χ², Risk Index, and Cost of Harm." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: drugs = [], isLoading } = useDrugs();
  const validationDrugs = drugs.filter((d) =>
    ["rofecoxib", "valdecoxib", "lumiracoxib"].includes(d.id),
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-4xl px-8 pt-10">
        <h1 className="mb-3 text-4xl font-semibold tracking-tight">Methodology</h1>
        <p className="mb-8 text-base leading-relaxed text-foreground/80">
          PharmaVigi is a live pharmacovigilance decision support system. It transforms real FDA adverse event
          data, statistical signal detection, complete drug market history, and AI-generated intelligence into
          a ranked, costed, decision-ready intelligence product.
        </p>

        {/* Methodology cards */}
        <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Method
            bg="bg-lavender"
            title="PRR"
            formula="(a/(a+b)) / (c/(c+d))"
            threshold="≥ 2.0"
            body="Proportional Reporting Ratio — how much more often a reaction appears for this drug vs all others in the class."
          />
          <Method
            bg="bg-rose"
            title="ROR"
            formula="(a·d) / (b·c)"
            threshold="≥ 2.0"
            body="Reporting Odds Ratio — statistical odds of a reaction being linked to this drug vs not."
          />
          <Method
            bg="bg-pistachio"
            title="χ² (chi-square)"
            formula="Σ (O − E)² / E"
            threshold="≥ 4.0"
            body="Confirms statistical significance. All three thresholds must cross simultaneously — EMA standard."
          />
          <Method
            bg="bg-yellow"
            title="Risk Index"
            formula="0.4·PRR + 0.4·Severity + 0.2·Volume"
            threshold="> 75 = CRITICAL"
            body="Composite score from 0–100. Severity = 3·deaths + 2·hosp + 1·disability."
          />
          <Method
            bg="bg-pink"
            title="Cost of Harm"
            formula="$500K·D + $15K·H + $200K·Dis"
            threshold="Modeled estimate"
            body="Benchmarks: $500K/death (avg litigation), $15K/hosp (HCUP), $200K/disability. Not audited."
          />
          <Method
            bg="bg-snow"
            title="Tiers"
            formula="LOW ≤ 25 · MOD ≤ 50 · HIGH ≤ 75 · CRITICAL > 75"
            threshold="Risk Index thresholds"
            body="Four tiers used consistently across the dashboard and scatter plot color coding."
          />
        </section>

        {/* Data sources */}
        <section className="mb-10 rounded-3xl bg-white p-6 ring-1 ring-black/5">
          <h2 className="mb-4 text-lg font-semibold">Data Sources</h2>
          <ul className="space-y-3 text-sm">
            <li>
              <strong>openFDA Drug Event API</strong> — real-time total counts, PRR/ROR against full FDA database,
              drug label information, current regulatory status. Public domain, no API key.
            </li>
            <li>
              <strong>FAERS historical dump</strong> — 500K reports, 2015–2026. Powers year-by-year trend analysis.
            </li>
            <li>
              <strong>Scraped sample</strong> — 61K reports across 19 NSAIDs/COX-2 inhibitors. Powers proportional
              analysis (rankings, rates, demographics).
            </li>
          </ul>
        </section>

        {/* Validation */}
        <section className="mb-10 rounded-3xl bg-critical/[0.05] p-6 ring-1 ring-critical/20">
          <h2 className="mb-1 text-lg font-semibold">Retrospective Validation</h2>
          <p className="mb-4 text-sm text-foreground/70">
            Three market withdrawals from the pre-loaded set must appear as CRITICAL tier. If they do — the
            methodology is validated against known real-world outcomes.
          </p>
          <div className="space-y-2">
            {validationDrugs.map((d) => {
              const passed = d.tier === "CRITICAL";
              return (
                <div key={d.id} className="flex items-center justify-between rounded-2xl bg-white p-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {d.generic} <span className="text-foreground/60">({d.brand})</span>
                    </div>
                    <div className="text-xs text-foreground/60">
                      Withdrawn {d.withdrawalYear} · expected CRITICAL · actual {d.tier} · Risk Index {d.riskIndex}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
                      passed ? "bg-low text-white" : "bg-critical text-white"
                    }`}
                  >
                    <Check className="size-3" />
                    {passed ? "Pass" : "Fail"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Drug reference */}
        <section className="mb-10 overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
          <h2 className="p-6 pb-3 text-lg font-semibold">All 19 NSAIDs — Reference Table</h2>
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.03] font-mono text-[9px] uppercase tracking-widest text-foreground/60">
              <tr>
                <th className="px-4 py-2.5">Generic</th>
                <th className="px-3 py-2.5">Brand</th>
                <th className="px-3 py-2.5">Class</th>
                <th className="px-3 py-2.5">Approved</th>
                <th className="px-3 py-2.5">Withdrawn</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {drugs.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2.5 font-medium">{d.generic}</td>
                  <td className="px-3 py-2.5 text-foreground/70">{d.brand}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground/70">{d.drugClass}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{d.approvalYear}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-critical">{d.withdrawalYear ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest">{d.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Limitations */}
        <section className="rounded-3xl bg-pink/40 p-6">
          <h2 className="mb-3 text-lg font-semibold">Limitations</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/80">
            <li>
              FAERS is voluntary reporting — reports do not establish causation, only association.
            </li>
            <li>
              Cost of harm figures are <em>modeled estimates</em> for relative comparison, not audited financials.
            </li>
            <li>
              Signals are <em>hypotheses</em> that require follow-up, not confirmed adverse drug reactions.
            </li>
            <li>
              Sample size varies per drug; smaller samples produce wider confidence intervals.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Method({
  bg,
  title,
  formula,
  threshold,
  body,
}: {
  bg: string;
  title: string;
  formula: string;
  threshold: string;
  body: string;
}) {
  return (
    <div className={`rounded-3xl p-5 ${bg}`}>
      <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground/60">
        Method
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{title}</div>
      <div className="mt-2 rounded-xl bg-white/60 px-2.5 py-1.5 font-mono text-[11px]">{formula}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-foreground/60">
        Threshold · {threshold}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">{body}</p>
    </div>
  );
}
