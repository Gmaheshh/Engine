import { z } from 'zod';
import {
  debugRowSchema,
  debugSummarySchema,
  rankedSignalSchema,
  runEngineResponseSchema,
  scanResponseSchema,
  signalSchema,
  universeResponseSchema,
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  health: {
    get: {
      method: 'GET' as const,
      path: '/health' as const,
      responses: {
        200: z.object({ status: z.string() }).passthrough(),
      },
    },
  },
  run: {
    get: {
      method: 'GET' as const,
      path: '/run' as const,
      responses: {
        200: runEngineResponseSchema,
      },
    },
  },
  signals: {
    list: {
      method: 'GET' as const,
      path: '/signals' as const,
      responses: {
        200: z.array(signalSchema),
      },
    },
    ranked: {
      method: 'GET' as const,
      path: '/signals/ranked' as const,
      responses: {
        200: z.array(rankedSignalSchema),
      },
    },
  },
  universe: {
    list: {
      method: 'GET' as const,
      path: '/universe' as const,
      responses: {
        200: universeResponseSchema,
      },
    },
  },
  debug: {
    get: {
      method: 'GET' as const,
      path: '/debug/:symbol' as const,
      responses: {
        200: z.array(debugRowSchema),
      },
    },
    summary: {
      method: 'GET' as const,
      path: '/debug/:symbol/summary' as const,
      responses: {
        200: debugSummarySchema,
      },
    },
  },
  scan: {
    list: {
      method: 'GET' as const,
      path: '/scan' as const,
      input: z.object({
        top_n: z.string().optional()
      }).optional(),
      responses: {
        200: scanResponseSchema,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
