import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

const STEPS = [
  "Pulling live FDA reports",
  "Running signal detection (PRR / ROR / χ²)",
  "Computing risk index and cost of harm",
  "Building regulatory timeline",
  "Generating AI executive summary",
];

export function AddDrugModal({
  drugName,
  onClose,
}: {
  drugName: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [step]);

  const done = step >= STEPS.length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Live pipeline
            </div>
            <div className="text-lg font-semibold tracking-tight">
              Adding {drugName || "new drug"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-black/5"
          >
            <X className="size-4" />
          </button>
        </div>

        <ol className="space-y-3">
          {STEPS.map((label, i) => {
            const isDone = i < step;
            const isActive = i === step;
            return (
              <li
                key={label}
                className="flex items-center gap-3 rounded-2xl bg-black/[0.03] px-3 py-2.5"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white ring-1 ring-black/10">
                  {isDone ? (
                    <Check className="size-3.5 text-low" />
                  ) : isActive ? (
                    <Loader2 className="size-3.5 animate-spin text-foreground" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </span>
                <span
                  className={`text-sm ${
                    isDone
                      ? "text-foreground/60 line-through"
                      : isActive
                      ? "font-medium text-foreground"
                      : "text-foreground/50"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {done ? "Complete" : `Step ${Math.min(step + 1, STEPS.length)} of ${STEPS.length}`}
          </span>
          <button
            onClick={onClose}
            disabled={!done}
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background disabled:opacity-40"
          >
            {done ? "Open dashboard" : "Working..."}
          </button>
        </div>
      </div>
    </div>
  );
}
