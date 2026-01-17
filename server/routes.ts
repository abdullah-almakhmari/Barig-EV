import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed database on startup
  await storage.seed();

  app.get(api.stations.list.path, async (req, res) => {
    try {
      const filters = api.stations.list.input?.parse(req.query);
      const stations = await storage.getStations(filters);
      res.json(stations);
    } catch (err) {
      if (err instanceof z.ZodError) {
         // handle optional input parsing if strictly required, but for query params usually permissive or we'd strict parse
         // Since input is optional, if req.query is empty it might be undefined, but .optional() handles that.
         // If parse fails on specific fields:
         return res.status(400).json({ message: "Invalid filters" });
      }
      throw err;
    }
  });

  app.get(api.stations.get.path, async (req, res) => {
    const station = await storage.getStation(Number(req.params.id));
    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }
    res.json(station);
  });

  app.post(api.stations.create.path, async (req, res) => {
    try {
      const input = api.stations.create.input.parse(req.body);
      const station = await storage.createStation(input);
      res.status(201).json(station);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.stations.getReports.path, async (req, res) => {
    const reports = await storage.getReports(Number(req.params.id));
    res.json(reports);
  });

  app.post(api.reports.create.path, async (req, res) => {
    try {
      const input = api.reports.create.input.parse(req.body);
      // Verify station exists
      const station = await storage.getStation(input.stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      const report = await storage.createReport(input);
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
