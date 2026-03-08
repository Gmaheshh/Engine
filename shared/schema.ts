import { z } from "zod";

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { id: string };

const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();

export const signalSchema = z.object({
  ts: nullableString,
  tradingsymbol: z.string().nullable().optional(),
  strategy: z.string().nullable().optional(),
  close: nullableNumber,
  ema_fast: nullableNumber,
  ema_slow: nullableNumber,
  adx: nullableNumber,
  atr: nullableNumber,
  rsi: nullableNumber,
  signal: z.union([z.number(), z.boolean()]).nullable().optional(),
});

export const rankedSignalSchema = signalSchema.extend({
  score: nullableNumber,
});

export const scanResultSchema = rankedSignalSchema.extend({
  entry: nullableNumber,
  sl: nullableNumber,
  target: nullableNumber,
  rr: nullableNumber,
  shares: nullableNumber,
  position_value: nullableNumber,
  max_loss_if_sl: nullableNumber,
  max_profit_if_target: nullableNumber,
  median_42: nullableNumber,
});

export const scanResponseSchema = z.object({
  status: z.string(),
  universe_count: z.number(),
  signals_count: z.number(),
  returned_count: z.number(),
  results: z.array(scanResultSchema),
});

export const debugRowSchema = signalSchema.extend({
  vb_signal: z.union([z.number(), z.boolean()]).nullable().optional(),
  median_42: nullableNumber,
});

export const debugSummarySchema = z.object({
  symbol: z.string(),
  ts: nullableString,
  close: nullableNumber,
  ema_fast: nullableNumber,
  ema_slow: nullableNumber,
  adx: nullableNumber,
  atr: nullableNumber,
  rsi: nullableNumber,
  median_42: nullableNumber,
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
