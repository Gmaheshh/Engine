import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { useToast } from "@/hooks/use-toast";
import { api, buildUrl } from "@shared/routes";
import type {
  DebugSummary,
  RunEngineResponse,
  ScanResponse,
  UniverseResponse,
} from "@shared/schema";

function normalizePath(path: string): string {
  if (path.startsWith("/api")) return path;
  if (path.startsWith("/")) return `/api${path}`;
  return `/api/${path}`;
}

async function parseErrorResponse(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const json = await res.json();
      if (typeof json?.message === "string" && json.message.trim()) {
        return json.message;
      }
      if (typeof json?.detail === "string" && json.detail.trim()) {
        return json.detail;
      }
      return `HTTP ${res.status}: ${res.statusText}`;
    }

    const text = await res.text();
    if (text.trim()) return text.trim();

    return `HTTP ${res.status}: ${res.statusText}`;
  } catch {
    return `HTTP ${res.status}: ${res.statusText}`;
  }
}

async function fetchPythonApi<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const url = normalizePath(path);

  const headers = new Headers(options?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const method = (options?.method || "GET").toUpperCase();
  const hasBody = options?.body !== undefined && options?.body !== null;

  if (hasBody && !headers.has("Content-Type") && method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const message = await parseErrorResponse(res);
    throw new Error(message);
  }

  const data: unknown = await res.json();
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    console.error(`[Zod] Validation failed for ${url}:`, parsed.error.format());
    throw new Error(`Invalid API response for ${url}`);
  }

  return parsed.data;
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () =>
      fetchPythonApi(api.health.get.path, api.health.get.responses[200]),
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useRunEngine() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchPythonApi(
        api.run.get.path,
        api.run.get.responses[200],
        { method: "GET" },
      ),
    onSuccess: (data: RunEngineResponse) => {
      toast({
        title: "Engine Run Triggered",
        description: `Generated ${data.signals_count} signals, ranked ${data.ranked_count}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["health"] });
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
    queryFn: () =>
      fetchPythonApi(
        api.signals.list.path,
        api.signals.list.responses[200],
      ),
    refetchInterval: autoRefresh ? 60_000 : false,
    retry: 1,
  });
}

export function useRankedSignals(autoRefresh = false) {
  return useQuery({
    queryKey: ["ranked-signals"],
    queryFn: () =>
      fetchPythonApi(
        api.signals.ranked.path,
        api.signals.ranked.responses[200],
      ),
    refetchInterval: autoRefresh ? 60_000 : false,
    retry: 1,
  });
}

export function useUniverse() {
  return useQuery({
    queryKey: ["universe"],
    queryFn: async (): Promise<UniverseResponse["symbols"]> => {
      const response = await fetchPythonApi(
        api.universe.list.path,
        api.universe.list.responses[200],
      );
      return (response as UniverseResponse).symbols;
    },
    retry: 1,
  });
}

export function useScan(topN?: string) {
  return useQuery({
    queryKey: ["scan", topN ?? null],
    queryFn: async (): Promise<ScanResponse["results"]> => {
      const url = topN
        ? `${api.scan.list.path}?top_n=${encodeURIComponent(topN)}`
        : api.scan.list.path;

      const response = await fetchPythonApi(
        url,
        api.scan.list.responses[200],
      );

      return (response as ScanResponse).results;
    },
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useDebug(symbol: string | null) {
  return useQuery({
    queryKey: ["debug", symbol],
    queryFn: () => {
      if (!symbol?.trim()) {
        throw new Error("Symbol required");
      }

      const url = buildUrl(api.debug.get.path, {
        symbol: symbol.trim().toUpperCase(),
      });

      return fetchPythonApi(url, api.debug.get.responses[200]);
    },
    enabled: Boolean(symbol?.trim()),
    retry: false,
  });
}

function buildExplanation(summary: DebugSummary): string {
  return `${summary.vwlm_reason} ${summary.vb_reason}`.trim();
}

export function useDebugSummary(symbol: string | null) {
  return useQuery({
    queryKey: ["debug-summary", symbol],
    queryFn: async () => {
      if (!symbol?.trim()) {
        throw new Error("Symbol required");
      }

      const url = buildUrl(api.debug.summary.path, {
        symbol: symbol.trim().toUpperCase(),
      });

      const summary = await fetchPythonApi(
        url,
        api.debug.summary.responses[200],
      );

      return {
        ...summary,
        latest_signal: summary.vwlm_signal ? "1" : "0",
        explanation: buildExplanation(summary),
      };
    },
    enabled: Boolean(symbol?.trim()),
    retry: false,
  });
}
