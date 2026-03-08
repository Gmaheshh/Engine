import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "http";

import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const app = express();
const httpServer = createServer(app);

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  }),
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "10mb",
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function safeStringify(value: unknown, maxLength = 800) {
  try {
    const text = JSON.stringify(value);
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  } catch {
    return "[unserializable-response]";
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  let capturedJsonResponse: unknown = undefined;

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    capturedJsonResponse = body;
    return originalJson(body);
  }) as Response["json"];

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;

    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

    if (capturedJsonResponse !== undefined) {
      logLine += ` :: ${safeStringify(capturedJsonResponse)}`;
    }

    log(logLine);
  });

  next();
});

async function bootstrap() {
  try {
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err?.status || err?.statusCode || 500;
      const message =
        typeof err?.message === "string" && err.message.trim().length > 0
          ? err.message
          : "Internal Server Error";

      console.error("[server-error]", err);

      if (res.headersSent) {
        return next(err);
      }

      return res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = Number.parseInt(process.env.PORT || "5000", 10);

    httpServer.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });

    httpServer.on("error", (error) => {
      console.error("[http-server-error]", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("[bootstrap-error]", error);
    process.exit(1);
  }
}

void bootstrap();
