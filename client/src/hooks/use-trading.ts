import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const API_BASE = "http://127.0.0.1:8000";

// Helper for standardizing API calls to the python backend
async function fetchPythonApi<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    const parsed = schema.safeParse(data);
    
    if (!parsed.success) {
      console.error(`[Zod] Validation failed for ${path}:`, parsed.error.format());
      // Return raw data as fallback in case schema is slightly off but app can still function
      return data as T;
    }
    
    return parsed.data;
  } catch (error) {
    console.error(`[API] Fetch failed for ${path}:`, error);
    throw error;
  }
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => fetchPythonApi(api.health.get.path, api.health.get.responses[200]),
    refetchInterval: 30000, // Check health every 30s
  });
}

export function useRunEngine() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => fetchPythonApi(api.run.get.path, api.run.get.responses[200]),
    onSuccess: (data) => {
      toast({
        title: "Engine Run Triggered",
        description: data.message || "Successfully executed strategy engine.",
      });
      // Invalidate signals data
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      queryClient.invalidateQueries({ queryKey: ['ranked-signals'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Engine Run Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

export function useSignals(autoRefresh = false) {
  return useQuery({
    queryKey: ['signals'],
    queryFn: () => fetchPythonApi(api.signals.list.path, api.signals.list.responses[200]),
    refetchInterval: autoRefresh ? 60000 : false,
  });
}

export function useRankedSignals(autoRefresh = false) {
  return useQuery({
    queryKey: ['ranked-signals'],
    queryFn: () => fetchPythonApi(api.signals.ranked.path, api.signals.ranked.responses[200]),
    refetchInterval: autoRefresh ? 60000 : false,
  });
}

export function useUniverse() {
  return useQuery({
    queryKey: ['universe'],
    queryFn: () => fetchPythonApi(api.universe.list.path, api.universe.list.responses[200]),
  });
}

export function useScan(topN?: string) {
  return useQuery({
    queryKey: ['scan', topN],
    queryFn: () => {
      const url = topN ? `${api.scan.list.path}?top_n=${topN}` : api.scan.list.path;
      return fetchPythonApi(url, api.scan.list.responses[200]);
    },
    refetchInterval: 60000,
  });
}

export function useDebug(symbol: string | null) {
  return useQuery({
    queryKey: ['debug', symbol],
    queryFn: () => {
      if (!symbol) throw new Error("Symbol required");
      const url = buildUrl(api.debug.get.path, { symbol: symbol.toUpperCase() });
      return fetchPythonApi(url, api.debug.get.responses[200]);
    },
    enabled: !!symbol && symbol.trim().length > 0,
  });
}

export function useDebugSummary(symbol: string | null) {
  return useQuery({
    queryKey: ['debug-summary', symbol],
    queryFn: () => {
      if (!symbol) throw new Error("Symbol required");
      const url = buildUrl(api.debug.summary.path, { symbol: symbol.toUpperCase() });
      return fetchPythonApi(url, api.debug.summary.responses[200]);
    },
    enabled: !!symbol && symbol.trim().length > 0,
  });
}
