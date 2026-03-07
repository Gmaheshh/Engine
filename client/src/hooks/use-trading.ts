import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api, buildUrl } from "@shared/routes";
import type {
  DebugSummary,
  RunEngineResponse,
  ScanResponse,
  UniverseResponse,
} from "@shared/schema";
import { z } from "zod";

const API_BASE = "/api";

async function fetchPythonApi<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    console.error(`[Zod] Validation failed for ${path}:`, parsed.error.format());
    throw new Error(`Invalid API response for ${path}`);
  }

  return parsed.data;
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => fetchPythonApi(api.health.get.path, api.health.get.responses[200]),
    refetchInterval: 30000,
  });
}

export function useRunEngine() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => fetchPythonApi(api.run.get.path, api.run.get.responses[200]),
    onSuccess: (data: RunEngineResponse) => {
      toast({
        title: "Engine Run Triggered",
        description: `Generated ${data.signals_count} signals, ranked ${data.ranked_count}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      queryClient.invalidateQueries({ queryKey: ["ranked-signals"] });
      queryClient.invalidateQueries({ queryKey: ["scan"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Engine Run Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSignals(autoRefresh = false) {
  return useQuery({
    queryKey: ["signals"],
    queryFn: () => fetchPythonApi(api.signals.list.path, api.signals.list.responses[200]),
    refetchInterval: autoRefresh ? 60000 : false,
  });
}

export function useRankedSignals(autoRefresh = false) {
  return useQuery({
    queryKey: ["ranked-signals"],
    queryFn: () => fetchPythonApi(api.signals.ranked.path, api.signals.ranked.responses[200]),
    refetchInterval: autoRefresh ? 60000 : false,
  });
}

export function useUniverse() {
  return useQuery({
    queryKey: ["universe"],
    queryFn: async () => {
      const response = await fetchPythonApi(api.universe.list.path, api.universe.list.responses[200]);
      return (response as UniverseResponse).symbols;
    },
  });
}

export function useScan(topN?: string) {
  return useQuery({
    queryKey: ["scan", topN],
    queryFn: async () => {
      const url = topN ? `${api.scan.list.path}?top_n=${topN}` : api.scan.list.path;
      const response = await fetchPythonApi(url, api.scan.list.responses[200]);
      return (response as ScanResponse).results;
    },
    refetchInterval: 60000,
  });
}

export function useDebug(symbol: string | null) {
  return useQuery({
    queryKey: ["debug", symbol],
    queryFn: () => {
      if (!symbol) {
        throw new Error("Symbol required");
      }
      const url = buildUrl(api.debug.get.path, { symbol: symbol.toUpperCase() });
      return fetchPythonApi(url, api.debug.get.responses[200]);
    },
    enabled: Boolean(symbol?.trim().length),
  });
}

function buildExplanation(summary: DebugSummary): string {
  return `${summary.vwlm_reason} ${summary.vb_reason}`.trim();
}

export function useDebugSummary(symbol: string | null) {
  return useQuery({
    queryKey: ["debug-summary", symbol],
    queryFn: async () => {
      if (!symbol) {
        throw new Error("Symbol required");
      }
      const url = buildUrl(api.debug.summary.path, { symbol: symbol.toUpperCase() });
      const summary = await fetchPythonApi(url, api.debug.summary.responses[200]);

      return {
        ...summary,
        latest_signal: summary.vwlm_signal ? "1" : "0",
        explanation: buildExplanation(summary),
      };
    },
    enabled: Boolean(symbol?.trim().length),
  });
}
