import { useRef, useState, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { tierColorClass, formatNumber, type Drug } from "@/data/drugs";

type Props = {
  drug: Drug;
  drugs: Drug[];
  onSelect: (id: string) => void;
  onAddDrug?: () => void;
};

export function DomeHeader({ drug, drugs, onSelect, onAddDrug }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [open]);

  return (
    <header className="relative">
      {/* Colored dome pane */}
      <div className="relative mx-auto h-[290px] max-w-[calc(100%-1.5rem)] rounded-b-[2rem] bg-pistachio dome-cutout">
        <div className="mx-auto flex h-full max-w-7xl items-start justify-between gap-6 px-8 pt-10">
          {/* Left: identity */}
          <div className="flex max-w-md flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground/70">
                {drug.drugClass}
              </span>
              {drug.status === "Withdrawn" && (
                <span className="rounded-full bg-critical px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                  Withdrawn · {drug.withdrawalYear}
                </span>
              )}
              {drug.status === "Restricted" && (
                <span className="rounded-full bg-high px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                  Restricted
                </span>
              )}
              {drug.status === "Active" && (
                <span className="rounded-full bg-white/60 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground/70">
                  Active
                </span>
              )}
            </div>

            {/* Drug selector */}
            <div ref={buttonRef}>
              <button
                onClick={() => setOpen((o) => !o)}
                className="group flex items-center gap-3 text-left"
              >
                <h1 className="text-5xl font-semibold leading-none tracking-tight">
                  {drug.generic}
                </h1>
                <ChevronDown className="mt-2 size-6 text-foreground/60 transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>

            <p className="text-sm font-medium text-foreground/70">
              {drug.brand}
              {drug.cas ? ` · CAS ${drug.cas}` : ""} · {drug.manufacturer} ·
              approved {drug.approvalYear}
            </p>

            <button
              onClick={onAddDrug}
              className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-black/10 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur hover:bg-black/15"
            >
              <Plus className="size-3.5" />
              Add new drug
            </button>
          </div>

          {/* Right: total reports */}
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground/60">
              Total FDA Reports
            </span>
            <div className="text-5xl font-semibold leading-none tracking-tight">
              {formatNumber(drug.totalReports)}
            </div>
            <span className="mt-1 text-xs font-medium text-foreground/70">
              through {drug.latestYear} · FAERS live
            </span>
            <div className="mt-4 rounded-2xl bg-black/10 px-4 py-2 backdrop-blur">
              <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/60">
                Strongest Signal PRR
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {drug.strongestPRR.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown portal — outside dome-cutout so it doesn't get clipped */}
      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-40 w-80 max-h-[420px] overflow-y-auto rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="mb-2 flex items-center justify-between px-3 py-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {drugs.length} drugs · NSAID class
                </span>
                <button
                  onClick={() => {
                    setOpen(false);
                    onAddDrug?.();
                  }}
                  className="flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold text-background"
                >
                  <Plus className="size-3" />
                  Add
                </button>
              </div>
              {drugs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    onSelect(d.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-black/[0.04] ${
                    d.id === drug.id ? "bg-black/[0.04]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {d.generic}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({d.brand})
                      </span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {d.status} · idx {d.riskIndex}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${tierColorClass(
                      d.tier,
                    )}`}
                  >
                    {d.tier}
                  </span>
                </button>
              ))}
            </div>
          </>,
          document.body
        )}

      {/* Risk Index badge — sits inside the dome cutout, straddling header & body */}
      <div className="pointer-events-none absolute left-1/2 top-[290px] -translate-x-1/2 -translate-y-1/2">
        <div className="grid size-44 place-items-center rounded-full bg-background p-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
          <div
            className={`flex size-full flex-col items-center justify-center rounded-full text-white ${
              drug.tier === "CRITICAL"
                ? "bg-critical"
                : drug.tier === "HIGH"
                ? "bg-high"
                : drug.tier === "MODERATE"
                ? "bg-moderate"
                : "bg-low"
            }`}
          >
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70">
              Risk Index
            </span>
            <span className="my-1 text-5xl font-semibold leading-none tabular-nums">
              {drug.riskIndex}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
              {drug.tier}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
