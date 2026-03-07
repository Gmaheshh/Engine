import { useState } from "react";
import { useScan } from "@/hooks/use-trading";
import { LayoutShell } from "@/components/layout-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Crosshair, BugPlay, ArrowRight, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export default function Scanner() {
  const [topN, setTopN] = useState("20");
  const [queryVal, setQueryVal] = useState("20");
  
  const { data: scanResults, isLoading, refetch } = useScan(queryVal);

  const handleScan = () => {
    setQueryVal(topN);
    refetch();
  };

  return (
    <LayoutShell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 animate-slide-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-primary" />
            Market Scanner
          </h2>
          <p className="text-muted-foreground font-mono text-sm mt-1">Cross-sectional analysis across universe</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <span>TOP_N:</span>
            <Input 
              type="number" 
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              className="w-20 h-9 bg-card border-border/50 text-center"
              min="1"
            />
          </div>
          
          <Button 
            onClick={handleScan}
            disabled={isLoading}
            className="font-mono text-xs h-9"
          >
            {isLoading ? "SCANNING..." : "RUN_SCAN"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-slide-in stagger-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="terminal-panel h-48 p-5 opacity-50 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="h-6 w-20 bg-white/10 animate-pulse rounded"></div>
                <div className="h-6 w-12 bg-white/10 animate-pulse rounded"></div>
              </div>
              <div className="space-y-3 mt-auto">
                <div className="h-4 w-full bg-white/5 animate-pulse rounded"></div>
                <div className="h-4 w-3/4 bg-white/5 animate-pulse rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : scanResults?.length === 0 ? (
        <div className="terminal-panel p-12 text-center border-dashed animate-slide-in stagger-2">
          <Crosshair className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <div className="text-muted-foreground font-mono mb-2">NO_RESULTS_FOUND</div>
          <p className="text-sm text-muted-foreground/60">Try adjusting parameters or expanding universe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-slide-in stagger-2">
          {scanResults?.map((res, i) => {
            const isHighConviction = (res.score || 0) >= 60;
            
            return (
              <div 
                key={`${res.symbol}-${i}`} 
                className={`terminal-panel p-5 group flex flex-col hover:-translate-y-1 transition-all duration-300 ${
                  isHighConviction ? 'border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold font-mono text-foreground tracking-tight">{res.symbol}</h3>
                    <div className="text-xs text-muted-foreground mt-0.5">{res.strategy}</div>
                  </div>
                  
                  <div className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                    isHighConviction ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'
                  }`}>
                    {res.score ? res.score.toFixed(1) : '-'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mt-2 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">Close</span>
                    <span className="font-mono font-medium">{res.close?.toFixed(2) || '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">RSI (14)</span>
                    <span className={`font-mono font-medium ${
                      (res.rsi || 50) > 70 ? 'text-rose-400' : (res.rsi || 50) < 30 ? 'text-green-400' : ''
                    }`}>
                      {res.rsi?.toFixed(1) || '-'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">ADX</span>
                    <span className={`font-mono font-medium ${
                      (res.adx || 0) > 25 ? 'text-green-400' : ''
                    }`}>
                      {res.adx?.toFixed(1) || '-'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">ATR</span>
                    <span className="font-mono font-medium">{res.atr?.toFixed(2) || '-'}</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border/40 flex justify-between items-center">
                  {isHighConviction ? (
                    <div className="flex items-center text-xs text-primary font-mono gap-1">
                      <TrendingUp className="w-3 h-3" /> ACTIONABLE
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground font-mono">MONITORING</div>
                  )}
                  
                  <Link 
                    href={`/debug?symbol=${res.symbol}`}
                    className="text-xs font-mono flex items-center text-muted-foreground group-hover:text-foreground transition-colors"
                  >
                    DEBUG <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LayoutShell>
  );
}
