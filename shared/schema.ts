import { z } from "zod";

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { id: string };

export const signalSchema = z.object({
  ts: z.string().optional(),
  tradingsymbol: z.string().optional(),
  strategy: z.string().optional(),
  close: z.number().optional(),
  ema_fast: z.number().optional(),
  ema_slow: z.number().optional(),
  adx: z.number().optional(),
  atr: z.number().optional(),
  rsi: z.number().optional(),
  signal: z.number().optional(),
});

export const rankedSignalSchema = signalSchema.extend({
  score: z.number().optional(),
});

export const scanResultSchema = rankedSignalSchema.extend({
  entry: z.number().optional(),
  sl: z.number().optional(),
  target: z.number().optional(),
  rr: z.number().optional(),
  shares: z.number().optional(),
  position_value: z.number().optional(),
  max_loss_if_sl: z.number().optional(),
  max_profit_if_target: z.number().optional(),
  median_42: z.number().optional(),
});

export const scanResponseSchema = z.object({
  status: z.string(),
  universe_count: z.number(),
  signals_count: z.number(),
  returned_count: z.number(),
  results: z.array(scanResultSchema),
});

export const debugRowSchema = signalSchema.extend({
  vb_signal: z.number().optional(),
  median_42: z.number().optional(),
});

export const debugSummarySchema = z.object({
  symbol: z.string(),
  ts: z.string().nullable().optional(),
  close: z.number().nullable().optional(),
  ema_fast: z.number().nullable().optional(),
  ema_slow: z.number().nullable().optional(),
  adx: z.number().nullable().optional(),
  atr: z.number().nullable().optional(),
  rsi: z.number().nullable().optional(),
  median_42: z.number().nullable().optional(),
  vwlm_signal: z.boolean(),
  vb_signal: z.boolean(),
  vwlm_reason: z.string(),
  vb_reason: z.string(),
});

export const runEngineResponseSchema = z.object({
  status: z.string(),
  signals_count: z.number(),
  ranked_count: z.number(),
});

export const universeResponseSchema = z.object({
  count: z.number(),
  symbols: z.array(z.string()),
});

export type Signal = z.infer<typeof signalSchema>;
export type RankedSignal = z.infer<typeof rankedSignalSchema>;
export type ScanResult = z.infer<typeof scanResultSchema>;
export type ScanResponse = z.infer<typeof scanResponseSchema>;
export type DebugRow = z.infer<typeof debugRowSchema>;
export type DebugSummary = z.infer<typeof debugSummarySchema>;
export type UniverseResponse = z.infer<typeof universeResponseSchema>;
export type RunEngineResponse = z.infer<typeof runEngineResponseSchema>;
