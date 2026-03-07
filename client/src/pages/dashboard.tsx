import { 
  useHealth, 
  useSignals, 
  useRankedSignals, 
  useUniverse, 
  useRunEngine 
} from "@/hooks/use-trading";
import { StatCard } from "@/components/stat-card";
import { SignalsTable } from "@/components/signals-table";
import { Button } from "@/components/ui/button";
import { LayoutShell } from "@/components/layout-shell";
import { 
  RefreshCw, 
  Activity, 
  Layers, 
  Target, 
  TrendingUp,
  AlertTriangle
} from "lucide-react";

export default function Dashboard() {
  // Fetch data with auto-refresh where appropriate
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: signals, isLoading: signalsLoading, refetch: refetchSignals } = useSignals(true);
  const { data: rankedSignals, isLoading: rankedLoading, refetch: refetchRanked } = useRankedSignals(true);
  const { data: universe, isLoading: universeLoading } = useUniverse();
  
  const runEngine = useRunEngine();

  const handleRefreshAll = () => {
    refetchSignals();
    refetchRanked();
  };

  // Calculate metrics
  const activeSignals = signals?.filter(s => s.signal !== 0).length || 0;
  const topScore = rankedSignals && rankedSignals.length > 0 ? rankedSignals[0].score : 0;

  return (
    <LayoutShell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 animate-slide-in stagger-1">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">System Overview</h2>
          <p className="text-muted-foreground font-mono text-sm mt-1">Real-time quantitative analysis engine</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshAll}
            className="font-mono text-xs border-border/50 bg-card hover:bg-white/5"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2 opacity-70" />
            REFRESH_DATA
          </Button>
          <Button 
            size="sm"
            onClick={() => runEngine.mutate()}
            disabled={runEngine.isPending}
            className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
          >
            <Activity className="w-3.5 h-3.5 mr-2" />
            {runEngine.isPending ? "COMPUTING..." : "TRIGGER_SCAN"}
          </Button>
        </div>
      </div>

      {!healthLoading && health?.status !== "ok" && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3 text-destructive animate-slide-in stagger-1">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Engine Offline or Degraded</h3>
            <p className="text-sm opacity-80 mt-1">The Python backend is not responding normally. Some metrics may be stale.</p>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-in stagger-2">
        <StatCard 
          title="Monitored Universe" 
          value={universe?.length || 0} 
          icon={<Layers className="w-5 h-5" />}
          loading={universeLoading}
          subtitle="Total tradable symbols"
        />
        <StatCard 
          title="Active Signals" 
          value={activeSignals} 
          icon={<Target className="w-5 h-5" />}
          loading={signalsLoading}
          subtitle="Non-zero signal generated"
          trend="neutral"
          trendValue={`${signals?.length || 0} total`}
        />
        <StatCard 
          title="Ranked Opportunities" 
          value={rankedSignals?.length || 0} 
          icon={<TrendingUp className="w-5 h-5" />}
          loading={rankedLoading}
          subtitle="Scored via ensemble model"
        />
        <StatCard 
          title="Max Confidence Score" 
          value={topScore ? topScore.toFixed(1) : "0.0"} 
          icon={<Activity className="w-5 h-5 text-green-400" />}
          loading={rankedLoading}
          subtitle="Current strongest signal"
          trend={topScore && topScore > 50 ? "up" : "neutral"}
          trendValue="Relative strength"
        />
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-in stagger-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Top Ranked Opportunities</h3>
            <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">LIMIT: 5</div>
          </div>
          
          <SignalsTable 
            signals={rankedSignals || []} 
            isLoading={rankedLoading} 
            limit={5}
            showScore={true}
          />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-bold">System Log</h3>
          <div className="terminal-panel p-4 h-[300px] flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2 text-muted-foreground">
              <span>TIMESTAMP</span>
              <span>EVENT</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="flex gap-4">
                <span className="text-muted-foreground/50">{new Date().toISOString().split('T')[1].substring(0,8)}</span>
                <span className="text-green-400">System initialized successfully</span>
              </div>
              {!healthLoading && (
                <div className="flex gap-4">
                  <span className="text-muted-foreground/50">{new Date().toISOString().split('T')[1].substring(0,8)}</span>
                  <span className="text-foreground">Health check: {health?.status || 'UNKNOWN'}</span>
                </div>
              )}
              {signals && (
                <div className="flex gap-4">
                  <span className="text-muted-foreground/50">{new Date().toISOString().split('T')[1].substring(0,8)}</span>
                  <span className="text-blue-400">Loaded {signals.length} raw signals</span>
                </div>
              )}
              <div className="flex gap-4 opacity-50 mt-4">
                <span className="text-muted-foreground/50">--:--:--</span>
                <span className="text-muted-foreground">Awaiting further events...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
