import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useDebug, useDebugSummary } from "@/hooks/use-trading";
import { LayoutShell } from "@/components/layout-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Terminal, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export default function DebugTool() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialSymbol = searchParams.get("symbol") || "";
  
  const [inputVal, setInputVal] = useState(initialSymbol);
  const [activeSymbol, setActiveSymbol] = useState(initialSymbol);

  const { data: rows, isLoading: rowsLoading, error: rowsError } = useDebug(activeSymbol);
  const { data: summary, isLoading: summaryLoading } = useDebugSummary(activeSymbol);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setActiveSymbol(inputVal.toUpperCase());
    }
  };

  // Keep input sync'd if URL changes externally
  useEffect(() => {
    if (initialSymbol && initialSymbol !== activeSymbol) {
      setInputVal(initialSymbol);
      setActiveSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  const isLoading = rowsLoading || summaryLoading;
  const hasData = rows && rows.length > 0;

  return (
    <LayoutShell>
      <div className="mb-8 animate-slide-in">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Terminal className="w-6 h-6 text-primary" />
          Strategy Debugger
        </h2>
        <p className="text-muted-foreground font-mono text-sm mt-1">Deep dive into signal generation logic per symbol</p>
      </div>

      <div className="terminal-panel p-6 mb-6 animate-slide-in stagger-1">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value.toUpperCase())}
              placeholder="ENTER SYMBOL (e.g. AAPL, BTC/USD)" 
              className="pl-10 font-mono text-lg h-12 bg-black/50 border-border"
            />
          </div>
          <Button type="submit" className="h-12 px-8 font-mono" disabled={isLoading || !inputVal.trim()}>
            {isLoading ? "QUERYING..." : "ANALYZE"}
          </Button>
        </form>
      </div>

      {rowsError && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive font-mono flex items-center gap-3 mb-6 animate-slide-in">
          <AlertCircle className="w-5 h-5" />
          <div>FAILED TO FETCH DATA FOR "{activeSymbol}": Symbol may not exist in universe.</div>
        </div>
      )}

      {activeSymbol && hasData && !isLoading && (
        <div className="space-y-6 animate-slide-in stagger-2">
          
          {/* Summary Card */}
          {summary && (
            <div className="terminal-panel border-primary/30 p-6 bg-gradient-to-br from-primary/5 to-transparent">
              <h3 className="font-mono text-sm text-primary mb-4 uppercase">Analysis Summary: {activeSymbol}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">LATEST SIGNAL</div>
                  <div className="text-xl font-mono font-bold">
                    {summary.latest_signal === '1' || summary.latest_signal === '1.0' ? <StatusBadge variant="long" className="text-sm px-3 py-1">LONG (1)</StatusBadge> :
                     summary.latest_signal === '-1' || summary.latest_signal === '-1.0' ? <StatusBadge variant="short" className="text-sm px-3 py-1">SHORT (-1)</StatusBadge> :
                     <StatusBadge variant="flat" className="text-sm px-3 py-1">FLAT (0)</StatusBadge>}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground font-mono mb-1">EXPLANATION</div>
                  <p className="text-sm text-foreground/90 leading-relaxed font-mono whitespace-pre-wrap">
                    {summary.explanation || "No explicit explanation generated for this state."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Time Series Table */}
          <div className="space-y-3">
            <h3 className="font-mono text-sm text-muted-foreground pl-1">INTERNAL STATE (LAST 10 TICKS)</h3>
            <div className="terminal-panel overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[10px] text-muted-foreground font-mono uppercase bg-black/40 border-b border-border/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium text-right">Close</th>
                    <th className="px-4 py-3 font-medium text-right">EMA Fast</th>
                    <th className="px-4 py-3 font-medium text-right">EMA Slow</th>
                    <th className="px-4 py-3 font-medium text-right">RSI</th>
                    <th className="px-4 py-3 font-medium text-right">ADX</th>
                    <th className="px-4 py-3 font-medium text-right border-l border-border/30">VB Sig</th>
                    <th className="px-4 py-3 font-medium text-right">Med_42</th>
                    <th className="px-4 py-3 font-medium text-right bg-primary/5">Final Sig</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-border/20 text-xs">
                  {rows.slice(-10).map((row, idx) => (
                    <tr key={idx} className="data-table-row hover:bg-white/[0.03]">
                      <td className="px-4 py-2 text-muted-foreground">{row.ts ? row.ts.substring(0, 19).replace('T', ' ') : '-'}</td>
                      <td className="px-4 py-2 text-right">{row.close?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{row.ema_fast?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{row.ema_slow?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{row.rsi?.toFixed(1) || '-'}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{row.adx?.toFixed(1) || '-'}</td>
                      <td className="px-4 py-2 text-right border-l border-border/30">
                        {row.vb_signal === 1 ? <span className="text-green-400">1</span> : 
                         row.vb_signal === -1 ? <span className="text-rose-400">-1</span> : '0'}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{row.median_42?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-2 text-right font-bold bg-primary/5">
                        {row.signal === 1 ? <span className="text-green-400">1</span> : 
                         row.signal === -1 ? <span className="text-rose-400">-1</span> : <span className="text-muted-foreground">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {!activeSymbol && !isLoading && (
        <div className="terminal-panel p-16 text-center border-dashed border-border/50 animate-slide-in stagger-2 opacity-50">
          <Terminal className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <div className="font-mono text-sm">AWAITING_INPUT</div>
          <p className="text-xs text-muted-foreground mt-2">Enter a symbol above to view internal strategy variables.</p>
        </div>
      )}
    </LayoutShell>
  );
}
