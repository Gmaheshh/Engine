import { useMemo, useState } from "react";
import { Download, Filter, Search } from "lucide-react";

import { LayoutShell } from "@/components/layout-shell";
import { SignalsTable } from "@/components/signals-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSignals } from "@/hooks/use-trading";

function toSignalNumber(value: unknown): number {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value;
  return 0;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export default function Signals() {
  const { data: signals = [], isLoading } = useSignals();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState(false);

  const filteredSignals = useMemo(() => {
    let result = signals;

    const trimmedSearch = search.trim().toLowerCase();
    if (trimmedSearch) {
      result = result.filter((signal) =>
        signal.tradingsymbol?.toLowerCase().includes(trimmedSearch),
      );
    }

    if (filterActive) {
      result = result.filter((signal) => toSignalNumber(signal.signal) !== 0);
    }

    return result;
  }, [signals, search, filterActive]);

  const handleExport = () => {
    if (filteredSignals.length === 0) return;

    const headers = [
      "ts",
      "tradingsymbol",
      "strategy",
      "close",
      "ema_fast",
      "ema_slow",
      "adx",
      "atr",
      "rsi",
      "signal",
    ] as const;

    const csvContent = [
      headers.join(","),
      ...filteredSignals.map((signal) =>
        headers
          .map((header) => csvEscape(signal[header]))
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `signals_${new Date().toISOString().split("T")[0]}.csv`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <LayoutShell>
      <div className="mb-6 flex animate-slide-in flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Live Signals
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Raw output from all configured strategies
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 border-border/50 bg-card pl-9 font-mono text-sm"
            />
          </div>

          <Button
            variant={filterActive ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterActive((prev) => !prev)}
            className={`h-9 font-mono text-xs ${
              filterActive
                ? "bg-primary text-primary-foreground"
                : "border-border/50 bg-card"
            }`}
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            ACTIVE_ONLY
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredSignals.length === 0}
            className="h-9 border-border/50 bg-card font-mono text-xs hover:text-foreground"
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            EXPORT_CSV
          </Button>
        </div>
      </div>

      <div className="animate-slide-in stagger-2">
        <SignalsTable signals={filteredSignals} isLoading={isLoading} />

        {!isLoading && (
          <div className="mt-4 text-right font-mono text-xs text-muted-foreground">
            Showing {filteredSignals.length} of {signals.length} signals
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
