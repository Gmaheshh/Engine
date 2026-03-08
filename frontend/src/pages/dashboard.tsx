import {
  Activity,
  AlertTriangle,
  Layers,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";

import { LayoutShell } from "@/components/layout-shell";
import { StatCard } from "@/components/stat-card";
import { SignalsTable } from "@/components/signals-table";
import { Button } from "@/components/ui/button";
import {
  useHealth,
  useRankedSignals,
  useRunEngine,
  useSignals,
  useUniverse,
} from "@/hooks/use-trading";

export default function Dashboard() {
  const { data: health, isLoading: healthLoading } = useHealth();
  const {
    data: signals = [],
    isLoading: signalsLoading,
    refetch: refetchSignals,
  } = useSignals(true);
  const {
    data: rankedSignals = [],
    isLoading: rankedLoading,
    refetch: refetchRanked,
  } = useRankedSignals(true);
  const { data: universe = [], isLoading: universeLoading } = useUniverse();

  const runEngine = useRunEngine();

  const handleRefreshAll = async () => {
    await Promise.allSettled([refetchSignals(), refetchRanked()]);
  };

  const activeSignals = signals.filter((s) => Number(s.signal ?? 0) !== 0).length;
  const topScore =
    rankedSignals.length > 0 ? Number(rankedSignals[0]?.score ?? 0) : 0;

  const currentTime = new Date()
    .toISOString()
    .split("T")[1]
    ?.substring(0, 8) ?? "--:--:--";

  const healthStatus =
    typeof health?.status === "string" ? health.status.toLowerCase() : "unknown";

  const isHealthy = healthStatus === "ok";

  return (
    <LayoutShell>
      <div className="mb-6 flex animate-slide-in stagger-1 flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            System Overview
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Real-time quantitative analysis engine
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="border-border/50 bg-card font-mono text-xs hover:bg-white/5"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5 opacity-70" />
            REFRESH_DATA
          </Button>

          <Button
            size="sm"
            onClick={() => runEngine.mutate()}
            disabled={runEngine.isPending}
            className="border border-primary/20 bg-primary/10 font-mono text-xs text-primary hover:bg-primary/20"
          >
            <Activity className="mr-2 h-3.5 w-3.5" />
            {runEngine.isPending ? "COMPUTING..." : "TRIGGER_SCAN"}
          </Button>
        </div>
      </div>

      {!healthLoading && !isHealthy && (
        <div className="mb-6 flex animate-slide-in stagger-1 items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold">Engine Offline or Degraded</h3>
            <p className="mt-1 text-sm opacity-80">
              The Python backend is not responding normally. Some metrics may be
              stale.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 grid animate-slide-in stagger-2 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monitored Universe"
          value={universe.length}
          icon={<Layers className="h-5 w-5" />}
          loading={universeLoading}
          subtitle="Total tradable symbols"
        />
        <StatCard
          title="Active Signals"
          value={activeSignals}
          icon={<Target className="h-5 w-5" />}
          loading={signalsLoading}
          subtitle="Non-zero signal generated"
          trend="neutral"
          trendValue={`${signals.length} total`}
        />
        <StatCard
          title="Ranked Opportunities"
          value={rankedSignals.length}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={rankedLoading}
          subtitle="Scored via ensemble model"
        />
        <StatCard
          title="Max Confidence Score"
          value={topScore.toFixed(1)}
          icon={<Activity className="h-5 w-5 text-green-400" />}
          loading={rankedLoading}
          subtitle="Current strongest signal"
          trend={topScore > 50 ? "up" : "neutral"}
          trendValue="Relative strength"
        />
      </div>

      <div className="grid animate-slide-in stagger-3 grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Top Ranked Opportunities</h3>
            <div className="rounded bg-primary/10 px-2 py-1 text-xs font-mono text-primary">
              LIMIT: 5
            </div>
          </div>

          <SignalsTable
            signals={rankedSignals}
            isLoading={rankedLoading}
            limit={5}
            showScore
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold">System Log</h3>

          <div className="terminal-panel flex h-[300px] flex-col p-4 font-mono text-xs">
            <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2 text-muted-foreground">
              <span>TIMESTAMP</span>
              <span>EVENT</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto">
              <div className="flex gap-4">
                <span className="text-muted-foreground/50">{currentTime}</span>
                <span className="text-green-400">
                  System initialized successfully
                </span>
              </div>

              {!healthLoading && (
                <div className="flex gap-4">
                  <span className="text-muted-foreground/50">{currentTime}</span>
                  <span className="text-foreground">
                    Health check: {health?.status ?? "UNKNOWN"}
                  </span>
                </div>
              )}

              {signals.length > 0 && (
                <div className="flex gap-4">
                  <span className="text-muted-foreground/50">{currentTime}</span>
                  <span className="text-blue-400">
                    Loaded {signals.length} raw signals
                  </span>
                </div>
              )}

              {runEngine.isSuccess && (
                <div className="flex gap-4">
                  <span className="text-muted-foreground/50">{currentTime}</span>
                  <span className="text-green-400">
                    Engine run completed successfully
                  </span>
                </div>
              )}

              {runEngine.isError && (
                <div className="flex gap-4">
                  <span className="text-muted-foreground/50">{currentTime}</span>
                  <span className="text-destructive">
                    Engine trigger failed
                  </span>
                </div>
              )}

              <div className="mt-4 flex gap-4 opacity-50">
                <span className="text-muted-foreground/50">--:--:--</span>
                <span className="text-muted-foreground">
                  Awaiting further events...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
