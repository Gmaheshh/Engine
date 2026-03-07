import { QueryClient } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export async function apiRequest(
  url: string,
  options: RequestInit = {},
  unauthorizedBehavior: UnauthorizedBehavior = "throw",
) {
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  const fullUrl = `/api${normalizedUrl}`;

  const res = await fetch(fullUrl, {
    ...options,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (unauthorizedBehavior === "returnNull" && res.status === 401) {
    return null;
  }

  await throwIfResNotOk(res);
  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
