import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Express } from "express";
import type { Server } from "http";
import { createLogger, createServer as createViteServer } from "vite";

import viteConfig from "../vite.config";

const viteLogger = createLogger();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(server: Server, app: Express) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: {
      middlewareMode: true,
      hmr: {
        server,
        path: "/vite-hmr",
      },
      allowedHosts: true,
    },
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf8");

      template = await vite.transformIndexHtml(req.originalUrl, template);

      res.status(200).setHeader("Content-Type", "text/html");
      res.end(template);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}
