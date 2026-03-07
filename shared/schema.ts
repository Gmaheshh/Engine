import { z } from "zod";

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

export const scanResultSchema = z.object({
  symbol: z.string().optional(),
  strategy: z.string().optional(),
  score: z.number().optional(),
  close: z.number().optional(),
  adx: z.number().optional(),
  atr: z.number().optional(),
  rsi: z.number().optional(),
});

export const debugRowSchema = signalSchema.extend({
  vb_signal: z.number().optional(),
  median_42: z.number().optional(),
});

export const debugSummarySchema = z.object({
  latest_signal: z.string().optional(),
  explanation: z.string().optional(),
});

export type Signal = z.infer<typeof signalSchema>;
export type RankedSignal = z.infer<typeof rankedSignalSchema>;
export type ScanResult = z.infer<typeof scanResultSchema>;
export type DebugRow = z.infer<typeof debugRowSchema>;
export type DebugSummary = z.infer<typeof debugSummarySchema>;