import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, Search, Terminal } from "lucide-react";

import { LayoutShell } from "@/components/layout-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebug, useDebugSummary } from "@/hooks/use-trading";

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toSignalValue(value: unknown): number {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatNumber(value: unknown, digits = 2): string {
  const num = toNumber(value);
  return num === null ? "-" : num.toFixed(digits);
}

function formatTs(value: string | null | undefined): string {
  if (!value) return "-";
  return value.substring(0, 19).replace("T", " ");
}

export default function DebugTool() {
  const [location] = useLocation();

  const initialSymbol = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return (searchParams.get("symbol") || "").toUpperCase();
  }, [location]);

  const [inputVal, setInputVal] = useState(initialSymbol);
  const [activeSymbol, setActiveSymbol] = useState(initialSymbol);

  const {
    data: rows = [],
    isLoading: rowsLoading,
    error: rowsError,
  } = useDebug(activeSymbol);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useDebugSummary(activeSymbol);

  useEffect(() => {
    setInputVal(initialSymbol);
    setActiveSymbol(initialSymbol);
  }, [initialSymbol]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = inputVal.trim().toUpperCase();
    if (next) {
      setActiveSymbol(next);
    }
  };

  const isLoading = rowsLoading || summaryLoading;
  const hasData = rows.length > 0;

  return (
    <LayoutShell>
      <div className="mb-8 animate-slide-in">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <Terminal className="h-6 w-6 text-primary" />
          Strategy Debugger
        </h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          Deep dive into signal generation logic per symbol
        </p>
      </div>

      <div className="terminal-panel mb-6 animate-slide-in stagger-1 p-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value.toUpperCase())}
              placeholder="ENTER SYMBOL (e.g. RELIANCE.NS)"
              className="h-12 border-border bg-black/50 pl-10 font-mono text-lg"
            />
          </div>

          <Button
            type="submit"
            className="h-12 px-8 font-mono"
            disabled={isLoading || !inputVal.trim()}
          >
            {isLoading ? "QUERYING..." : "ANALYZE"}
          </Button>
        </form>
      </div>

      {(rowsError || summaryError) && activeSymbol && (
        <div className="mb-6 flex animate-slide-in items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 font-mono text-destructive">
          <AlertCircle className="h-5 w-5" />
          <div>
            FAILED TO FETCH DATA FOR "{activeSymbol}": Symbol may not exist in
            universe.
          </div>
        </div>
      )}

      {activeSymbol && hasData && !isLoading && (
        <div className="space-y-6 animate-slide-in stagger-2">
          {summary && (
            <div className="terminal-panel border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6">
              <h3 className="mb-4 font-mono text-sm uppercase text-primary">
                Analysis Summary: {activeSymbol}
              </h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <div className="mb-1 font-mono text-xs text-muted-foreground">
                    LATEST SIGNAL
                  </div>
                  <div className="text-xl font-mono font-bold">
                    {summary.latest_signal === "1" ||
                    summary.latest_signal === "1.0" ? (
                      <StatusBadge
                        variant="long"
                        className="px-3 py-1 text-sm"
                      >
                        LONG (1)
                      </StatusBadge>
                    ) : summary.latest_signal === "-1" ||
                      summary.latest_signal === "-1.0" ? (
                      <StatusBadge
                        variant="short"
                        className="px-3 py-1 text-sm"
                      >
                        SHORT (-1)
                      </StatusBadge>
                    ) : (
                      <StatusBadge
                        variant="flat"
                        className="px-3 py-1 text-sm"
                      >
                        FLAT (0)
                      </StatusBadge>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="mb-1 font-mono text-xs text-muted-foreground">
                    EXPLANATION
                  </div>
                  <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
                    {summary.explanation ||
                      "No explicit explanation generated for this state."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="pl-1 font-mono text-sm text-muted-foreground">
              INTERNAL STATE (LAST 10 TICKS)
            </h3>

            <div className="terminal-panel overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="border-b border-border/50 bg-black/40 font-mono text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-right font-medium">Close</th>
                    <th className="px-4 py-3 text-right font-medium">
                      EMA Fast
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      EMA Slow
                    </th>
                    <th className="px-4 py-3 text-right font-medium">RSI</th>
                    <th className="px-4 py-3 text-right font-medium">ADX</th>
                    <th className="border-l border-border/30 px-4 py-3 text-right font-medium">
                      VB Sig
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Med_42
                    </th>
                    <th className="bg-primary/5 px-4 py-3 text-right font-medium">
                      Final Sig
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/20 font-mono text-xs">
                  {rows.slice(-10).map((row, idx) => {
                    const vbSignal = toSignalValue(row.vb_signal);
                    const finalSignal = toSignalValue(row.signal);

                    return (
                      <tr
                        key={`${row.ts ?? "row"}-${idx}`}
                        className="data-table-row hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatTs(row.ts)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(row.close, 2)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {formatNumber(row.ema_fast, 2)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {formatNumber(row.ema_slow, 2)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {formatNumber(row.rsi, 1)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {formatNumber(row.adx, 1)}
                        </td>
                        <td className="border-l border-border/30 px-4 py-2 text-right">
                          {vbSignal === 1 ? (
                            <span className="text-green-400">1</span>
                          ) : vbSignal === -1 ? (
                            <span className="text-rose-400">-1</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {formatNumber(row.median_42, 2)}
                        </td>
                        <td className="bg-primary/5 px-4 py-2 text-right font-bold">
                          {finalSignal === 1 ? (
                            <span className="text-green-400">1</span>
                          ) : finalSignal === -1 ? (
                            <span className="text-rose-400">-1</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!activeSymbol && !isLoading && (
        <div className="terminal-panel animate-slide-in stagger-2 border-dashed border-border/50 p-16 text-center opacity-50">
          <Terminal className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <div className="font-mono text-sm">AWAITING_INPUT</div>
          <p className="mt-2 text-xs text-muted-foreground">
            Enter a symbol above to view internal strategy variables.
          </p>
        </div>
      )}
    </LayoutShell>
  );
}
