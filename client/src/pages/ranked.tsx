import { useMemo } from "react";

import { LayoutShell } from "@/components/layout-shell";
import { SignalsTable } from "@/components/signals-table";
import { useRankedSignals } from "@/hooks/use-trading";

function toScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function RankedSignals() {
  const { data: signals = [], isLoading } = useRankedSignals(true);

  const sortedSignals = useMemo(() => {
    return [...signals].sort((a, b) => toScore(b.score) - toScore(a.score));
  }, [signals]);

  const topSignals = sortedSignals.slice(0, 10);
  const remainingSignals = sortedSignals.slice(10);

  return (
    <LayoutShell>
      <div className="mb-8 animate-slide-in">
        <div className="mb-2 flex items-center gap-3">
          <div className="h-8 w-2 rounded-sm bg-amber-500" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Ranked Opportunities
          </h2>
        </div>

        <p className="ml-5 font-mono text-sm text-muted-foreground">
          Signals processed through ensemble scoring and ranked by conviction.
          Auto-refreshes every 60s.
        </p>
      </div>

      <div className="animate-slide-in stagger-2">
        <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-amber-500/20 bg-amber-500/10 p-4">
          <h3 className="font-mono text-sm font-bold text-amber-400">
            TOP 10 HIGH-CONVICTION SETUPS
          </h3>
          <span className="font-mono text-xs text-amber-400/60">
            SORT: DESC(SCORE)
          </span>
        </div>

        <div className="overflow-hidden rounded-b-lg border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
          <SignalsTable
            signals={topSignals}
            isLoading={isLoading}
            showScore
          />
        </div>
      </div>

      {!isLoading && remainingSignals.length > 0 && (
        <div className="mt-12 animate-slide-in stagger-3">
          <h3 className="mb-4 pl-1 font-mono text-sm text-muted-foreground">
            REMAINDER OF UNIVERSE
          </h3>

          <SignalsTable
            signals={remainingSignals}
            isLoading={false}
            showScore
          />
        </div>
      )}
    </LayoutShell>
  );
}
