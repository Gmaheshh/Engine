import type { Express, Request, Response } from "express";
import type { Server } from "http";

const PYTHON_BACKEND_BASE = (
  process.env.PYTHON_BACKEND_BASE || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function buildBackendUrl(req: Request): string {
  const backendPath = req.originalUrl.replace(/^\/api/, "") || "/";
  return `${PYTHON_BACKEND_BASE}${backendPath}`;
}

function buildUpstreamHeaders(req: Request): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    const lowerKey = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lowerKey)) continue;
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else {
      headers.set(key, value);
    }
  }

  headers.set("accept", "application/json, text/plain, */*");

  return headers;
}

function canHaveBody(method: string) {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

async function readUpstreamBody(upstream: globalThis.Response): Promise<Buffer> {
  const arrayBuffer = await upstream.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function proxyToPythonBackend(req: Request, res: Response) {
  try {
    const backendUrl = buildBackendUrl(req);
    const method = req.method.toUpperCase();

    const headers = buildUpstreamHeaders(req);

    let body: BodyInit | undefined = undefined;

    if (canHaveBody(method)) {
      if (req.rawBody && Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
        body = req.rawBody;
      } else if (req.body && Object.keys(req.body).length > 0) {
        body = JSON.stringify(req.body);
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/json");
        }
      }
    }

    const upstream = await fetch(backendUrl, {
      method,
      headers,
      body,
      redirect: "follow",
    });

    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (HOP_BY_HOP_HEADERS.has(lowerKey)) return;
      res.setHeader(key, value);
    });

    const responseBody = await readUpstreamBody(upstream);

    if (!res.getHeader("content-type")) {
      res.setHeader(
        "content-type",
        upstream.headers.get("content-type") || "application/octet-stream",
      );
    }

    return res.send(responseBody);
  } catch (error) {
    console.error("[python-backend-proxy-error]", error);

    return res.status(502).json({
      message: "Python backend is unavailable",
      details: error instanceof Error ? error.message : "Unknown proxy error",
      backendBase: PYTHON_BACKEND_BASE,
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      proxy: "express",
      pythonBackendBase: PYTHON_BACKEND_BASE,
      timestamp: new Date().toISOString(),
    });
  });

  app.all("/api/*path", proxyToPythonBackend);

  return httpServer;
}

