import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // We do not need any backend routes here because the actual backend
  // is a Python FastAPI server running on http://127.0.0.1:8000.
  // We just return the httpServer to satisfy the Replit fullstack template.

  return httpServer;
}
