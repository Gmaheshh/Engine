import { Signal, RankedSignal } from "@shared/schema";
import { SignalBadge } from "./status-badge";
import { Link } from "wouter";
import { BugPlay } from "lucide-react";

interface SignalsTableProps {
  signals: (Signal | RankedSignal)[];
  isLoading?: boolean;
  limit?: number;
  showScore?: boolean;
}

function formatNumber(num: number | null | undefined, decimals = 2) {
  if (num === null || num === undefined) return "-";
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function SignalsTable({ signals, isLoading, limit, showScore = false }: SignalsTableProps) {
  if (isLoading) {
    return (
      <div className="terminal-panel p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const displaySignals = limit ? signals.slice(0, limit) : signals;

  if (displaySignals.length === 0) {
    return (
      <div className="terminal-panel p-12 text-center border-dashed">
        <div className="text-muted-foreground font-mono mb-2">NO_DATA_FOUND</div>
        <p className="text-sm text-muted-foreground/60">The universe query returned empty results.</p>
      </div>
    );
  }

  return (
    <div className="terminal-panel overflow-x-auto">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-muted-foreground font-mono uppercase bg-black/40 border-b border-border/50 sticky top-0">
          <tr>
            <th className="px-4 py-3 font-medium">Symbol</th>
            <th className="px-4 py-3 font-medium">Strategy</th>
            {showScore && <th className="px-4 py-3 font-medium text-right">Score</th>}
            <th className="px-4 py-3 font-medium text-right">Signal</th>
            <th className="px-4 py-3 font-medium text-right">Close</th>
            <th className="px-4 py-3 font-medium text-right">RSI</th>
            <th className="px-4 py-3 font-medium text-right">ADX</th>
            <th className="px-4 py-3 font-medium text-right">ATR</th>
            <th className="px-4 py-3 font-medium text-right">EMA (F/S)</th>
            <th className="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="font-mono divide-y divide-border/20">
          {displaySignals.map((signal, idx) => {
            const isRanked = 'score' in signal;
            const score = isRanked ? (signal as RankedSignal).score : undefined;
            
            return (
              <tr key={`${signal.tradingsymbol}-${idx}`} className="data-table-row hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-bold text-foreground">
                  {signal.tradingsymbol || "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {signal.strategy || "-"}
                </td>
                {showScore && (
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      (score || 0) > 70 ? 'bg-green-500/20 text-green-400' :
                      (score || 0) > 40 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-white/5 text-muted-foreground'
                    }`}>
                      {formatNumber(score, 1)}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <SignalBadge signal={signal.signal} />
                </td>
                <td className="px-4 py-3 text-right font-number">
                  {formatNumber(signal.close)}
                </td>
                <td className="px-4 py-3 text-right font-number text-muted-foreground">
                  {formatNumber(signal.rsi)}
                </td>
                <td className="px-4 py-3 text-right font-number text-muted-foreground">
                  {formatNumber(signal.adx)}
                </td>
                <td className="px-4 py-3 text-right font-number text-muted-foreground">
                  {formatNumber(signal.atr)}
                </td>
                <td className="px-4 py-3 text-right font-number text-muted-foreground text-xs">
                  {formatNumber(signal.ema_fast, 1)} / {formatNumber(signal.ema_slow, 1)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/debug?symbol=${signal.tradingsymbol}`} className="inline-flex items-center justify-center w-8 h-8 rounded bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer text-muted-foreground">
                    <BugPlay className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
