import { useRankedSignals } from "@/hooks/use-trading";
import { LayoutShell } from "@/components/layout-shell";
import { SignalsTable } from "@/components/signals-table";

export default function RankedSignals() {
  const { data: signals, isLoading } = useRankedSignals(true);

  // The backend already sorts these by score descending according to the spec,
  // but we ensure it here just in case.
  const sortedSignals = signals ? [...signals].sort((a, b) => (b.score || 0) - (a.score || 0)) : [];

  return (
    <LayoutShell>
      <div className="mb-8 animate-slide-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-8 bg-amber-500 rounded-sm"></div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Ranked Opportunities</h2>
        </div>
        <p className="text-muted-foreground font-mono text-sm ml-5">
          Signals processed through ensemble scoring and ranked by conviction. Auto-refreshes every 60s.
        </p>
      </div>

      <div className="animate-slide-in stagger-2">
        <div className="p-4 rounded-t-lg bg-amber-500/10 border border-amber-500/20 border-b-0 flex items-center justify-between">
          <h3 className="font-mono text-sm text-amber-400 font-bold">TOP 10 HIGH-CONVICTION SETUPS</h3>
          <span className="text-xs text-amber-400/60 font-mono">SORT: DESC(SCORE)</span>
        </div>
        <div className="border border-amber-500/20 rounded-b-lg overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.05)]">
          <SignalsTable 
            signals={sortedSignals.slice(0, 10)} 
            isLoading={isLoading}
            showScore={true}
          />
        </div>
      </div>

      {sortedSignals.length > 10 && (
        <div className="mt-12 animate-slide-in stagger-3">
          <h3 className="font-mono text-sm text-muted-foreground mb-4 pl-1">REMAINDER OF UNIVERSE</h3>
          <SignalsTable 
            signals={sortedSignals.slice(10)} 
            isLoading={isLoading}
            showScore={true}
          />
        </div>
      )}
    </LayoutShell>
  );
}
