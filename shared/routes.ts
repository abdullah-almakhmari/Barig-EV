import { z } from 'zod';
import { insertStationSchema, insertReportSchema, insertUserVehicleSchema, stations, reports, chargingSessions, evVehicles, userVehicles } from './schema';

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
    startCharging: {
      method: 'POST' as const,
      path: '/api/stations/:id/start-charging',
      responses: {
        200: z.custom<typeof stations.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    stopCharging: {
      method: 'POST' as const,
      path: '/api/stations/:id/stop-charging',
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
  chargingSessions: {
    start: {
      method: 'POST' as const,
      path: '/api/charging-sessions/start',
      input: z.object({
        stationId: z.number(),
        userVehicleId: z.number().optional(),
        batteryStartPercent: z.number().min(0).max(100).optional(),
      }),
      responses: {
        201: z.custom<typeof chargingSessions.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    end: {
      method: 'POST' as const,
      path: '/api/charging-sessions/:id/end',
      input: z.object({
        batteryEndPercent: z.number().min(0).max(100).optional(),
        energyKwh: z.number().min(0).optional(),
      }),
      responses: {
        200: z.custom<typeof chargingSessions.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/charging-sessions',
      input: z.object({
        stationId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof chargingSessions.$inferSelect>()),
      },
    },
    getActive: {
      method: 'GET' as const,
      path: '/api/stations/:id/active-session',
      responses: {
        200: z.custom<typeof chargingSessions.$inferSelect>().nullable(),
        404: errorSchemas.notFound,
      },
    },
  },
  vehicles: {
    list: {
      method: 'GET' as const,
      path: '/api/vehicles',
      responses: {
        200: z.array(z.custom<typeof evVehicles.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vehicles/:id',
      responses: {
        200: z.custom<typeof evVehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  userVehicles: {
    list: {
      method: 'GET' as const,
      path: '/api/user-vehicles',
      responses: {
        200: z.array(z.custom<typeof userVehicles.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/user-vehicles/:id',
      responses: {
        200: z.custom<typeof userVehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/user-vehicles',
      input: insertUserVehicleSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof userVehicles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/user-vehicles/:id',
      input: insertUserVehicleSchema.partial().omit({ userId: true }),
      responses: {
        200: z.custom<typeof userVehicles.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/user-vehicles/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    setDefault: {
      method: 'POST' as const,
      path: '/api/user-vehicles/:id/set-default',
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
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
