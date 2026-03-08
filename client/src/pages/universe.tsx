import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Layers, Search } from "lucide-react";

import { LayoutShell } from "@/components/layout-shell";
import { Input } from "@/components/ui/input";
import { useUniverse } from "@/hooks/use-trading";

export default function Universe() {
  const { data: universe = [], isLoading } = useUniverse();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return universe;
    return universe.filter((symbol) => symbol.toLowerCase().includes(query));
  }, [universe, search]);

  return (
    <LayoutShell>
      <div className="mb-8 flex animate-slide-in flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Layers className="h-6 w-6 text-primary" />
            Trading Universe
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Symbols actively monitored by the engine
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter symbols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border/50 bg-card pl-9 font-mono"
          />
        </div>
      </div>

      <div className="grid animate-slide-in stagger-2 grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="terminal-panel sticky top-6 p-6">
            <h3 className="mb-4 font-mono text-xs text-muted-foreground">
              UNIVERSE_STATS
            </h3>

            <div className="mb-2 text-5xl font-mono font-bold tracking-tight text-foreground">
              {isLoading ? "-" : universe.length}
            </div>

            <div className="mb-6 text-sm text-primary">Total Symbols</div>

            <div className="space-y-3 border-t border-border/50 pt-6 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filtered:</span>
                <span>{filtered.length}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Source:</span>
                <span className="text-green-400">Live Backend</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-24 animate-pulse rounded border border-border/30 bg-white/5"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filtered.map((symbol) => (
                <Link
                  key={symbol}
                  href={`/debug?symbol=${encodeURIComponent(symbol)}`}
                  className="group flex cursor-pointer items-center gap-2 rounded border border-border/50 bg-card px-4 py-2 font-mono text-sm text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5"
                >
                  {symbol}
                  <ExternalLink className="h-3 w-3 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}

              {filtered.length === 0 && (
                <div className="w-full rounded-md border border-dashed border-border/50 p-12 text-center font-mono text-muted-foreground">
                  NO_SYMBOLS_MATCH_FILTER
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </LayoutShell>
  );
}
