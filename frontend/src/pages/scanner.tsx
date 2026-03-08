import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Crosshair, TrendingUp } from "lucide-react";

import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScan } from "@/hooks/use-trading";

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNumber(value: unknown, digits = 2): string {
  const num = toNumber(value);
  return num === null ? "-" : num.toFixed(digits);
}

export default function Scanner() {
  const [topN, setTopN] = useState("20");
  const [queryVal, setQueryVal] = useState("20");

  const { data: scanResults = [], isLoading } = useScan(queryVal);

  const normalizedTopN = useMemo(() => {
    const parsed = Number.parseInt(topN, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return "20";
    return String(parsed);
  }, [topN]);

  const handleScan = () => {
    setQueryVal(normalizedTopN);
  };

  return (
    <LayoutShell>
      <div className="mb-6 flex animate-slide-in flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Crosshair className="h-6 w-6 text-primary" />
            Market Scanner
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Cross-sectional analysis across universe
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
            <span>TOP_N:</span>
            <Input
              type="number"
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              className="h-9 w-20 border-border/50 bg-card text-center"
              min="1"
              step="1"
            />
          </div>

          <Button
            onClick={handleScan}
            disabled={isLoading}
            className="h-9 font-mono text-xs"
          >
            {isLoading ? "SCANNING..." : "RUN_SCAN"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid animate-slide-in stagger-2 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="terminal-panel flex h-48 flex-col justify-between p-5 opacity-50"
            >
              <div className="flex justify-between">
                <div className="h-6 w-20 animate-pulse rounded bg-white/10" />
                <div className="h-6 w-12 animate-pulse rounded bg-white/10" />
              </div>

              <div className="mt-auto space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-white/5" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : scanResults.length === 0 ? (
        <div className="terminal-panel animate-slide-in stagger-2 border-dashed p-12 text-center">
          <Crosshair className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <div className="mb-2 font-mono text-muted-foreground">
            NO_RESULTS_FOUND
          </div>
          <p className="text-sm text-muted-foreground/60">
            Try adjusting parameters or expanding universe.
          </p>
        </div>
      ) : (
        <div className="grid animate-slide-in stagger-2 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {scanResults.map((res, i) => {
            const score = toNumber(res.score) ?? 0;
            const rsi = toNumber(res.rsi);
            const adx = toNumber(res.adx);
            const isHighConviction = score >= 60;

            return (
              <div
                key={`${res.tradingsymbol ?? "UNKNOWN"}-${i}`}
                className={`terminal-panel group flex flex-col p-5 transition-all duration-300 hover:-translate-y-1 ${
                  isHighConviction
                    ? "border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    : ""
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-mono text-xl font-bold tracking-tight text-foreground">
                      {res.tradingsymbol ?? "-"}
                    </h3>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {res.strategy ?? "-"}
                    </div>
                  </div>

                  <div
                    className={`rounded px-2 py-1 font-mono text-xs font-bold ${
                      isHighConviction
                        ? "bg-primary/20 text-primary"
                        : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {score > 0 ? score.toFixed(1) : "-"}
                  </div>
                </div>

                <div className="mt-2 mb-6 grid grid-cols-2 gap-x-2 gap-y-3 text-sm">
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      Close
                    </span>
                    <span className="font-mono font-medium">
                      {formatNumber(res.close, 2)}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      RSI (14)
                    </span>
                    <span
                      className={`font-mono font-medium ${
                        rsi !== null && rsi > 70
                          ? "text-rose-400"
                          : rsi !== null && rsi < 30
                            ? "text-green-400"
                            : ""
                      }`}
                    >
                      {formatNumber(rsi, 1)}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      ADX
                    </span>
                    <span
                      className={`font-mono font-medium ${
                        adx !== null && adx > 25 ? "text-green-400" : ""
                      }`}
                    >
                      {formatNumber(adx, 1)}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      ATR
                    </span>
                    <span className="font-mono font-medium">
                      {formatNumber(res.atr, 2)}
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-4">
                  {isHighConviction ? (
                    <div className="flex items-center gap-1 font-mono text-xs text-primary">
                      <TrendingUp className="h-3 w-3" />
                      ACTIONABLE
                    </div>
                  ) : (
                    <div className="font-mono text-xs text-muted-foreground">
                      MONITORING
                    </div>
                  )}

                  <Link
                    href={`/debug?symbol=${encodeURIComponent(
                      res.tradingsymbol ?? "",
                    )}`}
                    className="flex items-center font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground"
                  >
                    DEBUG <ArrowRight className="ml-1 h-3 w-3" />
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
