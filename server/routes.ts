import type { Express, Request, Response } from "express";
import { type Server } from "http";

const PYTHON_BACKEND_BASE = process.env.PYTHON_BACKEND_BASE ?? "http://127.0.0.1:8000";

function buildBackendUrl(req: Request): string {
  const backendPath = req.path.replace(/^\/api/, "") || "/";
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  return `${PYTHON_BACKEND_BASE}${backendPath}${query}`;
}

async function proxyToPythonBackend(req: Request, res: Response) {
  try {
    const backendUrl = buildBackendUrl(req);
    const upstream = await fetch(backendUrl, {
      method: req.method,
      headers: {
        Accept: "application/json",
      },
    });

    const contentType = upstream.headers.get("content-type") ?? "application/json";
    res.status(upstream.status);
    res.setHeader("content-type", contentType);

    if (contentType.includes("application/json")) {
      const body = await upstream.json();
      return res.json(body);
    }

    const bodyText = await upstream.text();
    return res.send(bodyText);
  } catch (error) {
    console.error("Python backend proxy failed:", error);
    return res.status(502).json({
      message: "Python backend is unavailable",
      details: error instanceof Error ? error.message : "Unknown proxy error",
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/*path", proxyToPythonBackend);
  return httpServer;
}
