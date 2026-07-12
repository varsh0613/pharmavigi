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
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (drugName: string) => Promise<void>;
}) {
  const [drugName, setDrugName] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || step >= STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [step, running]);

  const done = running && step >= STEPS.length && !error;

  async function handleStart() {
    const name = drugName.trim();
    if (!name) return;
    setRunning(true);
    setStep(0);
    setError(null);
    try {
      await onSubmit(name);
      setStep(STEPS.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Live pipeline
            </div>
            <div className="text-lg font-semibold tracking-tight">Add new drug</div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-black/5"
          >
            <X className="size-4" />
          </button>
        </div>

        {!running && (
          <div className="mb-4">
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Drug name (generic)
            </label>
            <input
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              placeholder="e.g. Celecoxib"
              className="w-full rounded-xl bg-black/[0.04] px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-black/15"
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
          </div>
        )}

        {running && (
          <ol className="space-y-3">
            {STEPS.map((label, i) => {
              const isDone = i < step;
              const isActive = i === step && !done;
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
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-critical/10 px-3 py-2 text-xs text-critical">{error}</p>
        )}

        <div className="mt-5 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {!running ? "Enter name to start" : done ? "Complete" : `Step ${Math.min(step + 1, STEPS.length)} of ${STEPS.length}`}
          </span>
          {!running ? (
            <button
              onClick={handleStart}
              disabled={!drugName.trim()}
              className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background disabled:opacity-40"
            >
              Run analysis
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={!done}
              className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background disabled:opacity-40"
            >
              {done ? "Open dashboard" : "Working..."}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
