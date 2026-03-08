import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  const indexPath = path.resolve(distPath, "index.html");

  if (!fs.existsSync(distPath) || !fs.existsSync(indexPath)) {
    throw new Error(
      `Could not find the production client build at ${distPath}. Run the build first.`,
    );
  }

  app.use(
    express.static(distPath, {
      index: false,
      extensions: ["html"],
      maxAge: "1h",
    }),
  );

  app.use("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }

    return res.sendFile(indexPath);
  });
}
