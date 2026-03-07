async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(${res.status}: ${text});
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export async function apiRequest(
  url: string,
  options: RequestInit = {},
  unauthorizedBehavior: UnauthorizedBehavior = "throw"
) {
  if (!url.startsWith("/")) url = "/" + url;

  const fullUrl = http://127.0.0.1:8000${url};

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
  return await res.json();
}

export const queryClient = {
  getQueryData: () => undefined,
  setQueryData: () => undefined,
};
