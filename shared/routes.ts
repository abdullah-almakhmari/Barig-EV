import { z } from 'zod';
import { insertStationSchema, insertReportSchema, stations, reports } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  stations: {
    list: {
      method: 'GET' as const,
      path: '/api/stations',
      input: z.object({
        search: z.string().optional(),
        city: z.string().optional(),
        type: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof stations.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/stations/:id',
      responses: {
        200: z.custom<typeof stations.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/stations',
      input: insertStationSchema,
      responses: {
        201: z.custom<typeof stations.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    getReports: {
      method: 'GET' as const,
      path: '/api/stations/:id/reports',
      responses: {
        200: z.array(z.custom<typeof reports.$inferSelect>()),
        404: errorSchemas.notFound,
      },
    },
    updateAvailability: {
      method: 'PATCH' as const,
      path: '/api/stations/:id/availability',
      input: z.object({
        availableChargers: z.number().min(0),
      }),
      responses: {
        200: z.custom<typeof stations.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  reports: {
    create: {
      method: 'POST' as const,
      path: '/api/reports',
      input: insertReportSchema,
      responses: {
        201: z.custom<typeof reports.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
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
