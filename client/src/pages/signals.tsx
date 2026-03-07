import { useState, useMemo } from "react";
import { useSignals } from "@/hooks/use-trading";
import { LayoutShell } from "@/components/layout-shell";
import { SignalsTable } from "@/components/signals-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Filter } from "lucide-react";

export default function Signals() {
  const { data: signals, isLoading } = useSignals();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState(false);

  const filteredSignals = useMemo(() => {
    if (!signals) return [];
    let result = signals;
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.tradingsymbol?.toLowerCase().includes(q));
    }
    
    if (filterActive) {
      result = result.filter(s => s.signal !== 0);
    }
    
    return result;
  }, [signals, search, filterActive]);

  const handleExport = () => {
    if (!signals || signals.length === 0) return;
    
    // Simple CSV generation
    const headers = ["ts", "tradingsymbol", "strategy", "close", "ema_fast", "ema_slow", "adx", "atr", "rsi", "signal"];
    const csvContent = [
      headers.join(","),
      ...filteredSignals.map(s => 
        headers.map(h => {
          const val = s[h as keyof typeof s];
          return val === null || val === undefined ? "" : String(val);
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `signals_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <LayoutShell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 animate-slide-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Live Signals</h2>
          <p className="text-muted-foreground font-mono text-sm mt-1">Raw output from all configured strategies</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search symbol..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/50 font-mono text-sm h-9"
            />
          </div>
          
          <Button 
            variant={filterActive ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilterActive(!filterActive)}
            className={`font-mono text-xs h-9 ${filterActive ? 'bg-primary text-primary-foreground' : 'bg-card border-border/50'}`}
          >
            <Filter className="w-3.5 h-3.5 mr-2" />
            ACTIVE_ONLY
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
            disabled={!signals || signals.length === 0}
            className="font-mono text-xs h-9 bg-card border-border/50 hover:text-foreground"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            EXPORT_CSV
          </Button>
        </div>
      </div>

      <div className="animate-slide-in stagger-2">
        <SignalsTable 
          signals={filteredSignals} 
          isLoading={isLoading} 
        />
        
        {!isLoading && filteredSignals.length > 0 && (
          <div className="mt-4 text-right text-xs font-mono text-muted-foreground">
            Showing {filteredSignals.length} of {signals?.length || 0} signals
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
