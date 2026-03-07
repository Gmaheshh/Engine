import { useState } from "react";
import { useUniverse } from "@/hooks/use-trading";
import { LayoutShell } from "@/components/layout-shell";
import { Input } from "@/components/ui/input";
import { Search, Layers, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function Universe() {
  const { data: universe, isLoading } = useUniverse();
  const [search, setSearch] = useState("");

  const filtered = universe 
    ? universe.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <LayoutShell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 animate-slide-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Trading Universe
          </h2>
          <p className="text-muted-foreground font-mono text-sm mt-1">Symbols actively monitored by the engine</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Filter symbols..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/50 font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-in stagger-2">
        <div className="lg:col-span-1">
          <div className="terminal-panel p-6 sticky top-6">
            <h3 className="font-mono text-xs text-muted-foreground mb-4">UNIVERSE_STATS</h3>
            <div className="text-5xl font-mono font-bold tracking-tight text-foreground mb-2">
              {isLoading ? "-" : universe?.length || 0}
            </div>
            <div className="text-sm text-primary mb-6">Total Symbols</div>
            
            <div className="space-y-3 pt-6 border-t border-border/50 text-sm font-mono">
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
              {[...Array(24)].map((_, i) => (
                <div key={i} className="w-24 h-10 bg-white/5 animate-pulse rounded border border-border/30"></div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filtered.map((symbol) => (
                <Link 
                  key={symbol} 
                  href={`/debug?symbol=${symbol}`}
                  className="px-4 py-2 rounded bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5 text-foreground font-mono text-sm transition-all duration-200 group flex items-center gap-2 cursor-pointer"
                >
                  {symbol}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                </Link>
              ))}
              
              {filtered.length === 0 && (
                <div className="w-full p-12 text-center text-muted-foreground font-mono border border-dashed border-border/50 rounded-md">
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
