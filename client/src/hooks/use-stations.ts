import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertStation, InsertReport } from "@shared/schema";
import { z } from "zod";

// --- Stations Hooks ---

export function useStations(filters?: { search?: string; city?: string; type?: string }) {
  return useQuery({
    queryKey: [api.stations.list.path, filters],
    queryFn: async () => {
      // Build query string manually or use URLSearchParams
      const url = new URL(api.stations.list.path, window.location.origin);
      if (filters?.search) url.searchParams.append("search", filters.search);
      if (filters?.city) url.searchParams.append("city", filters.city);
      if (filters?.type) url.searchParams.append("type", filters.type);

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stations");
      return api.stations.list.responses[200].parse(await res.json());
    },
  });
}

export function useStation(id: number) {
  return useQuery({
    queryKey: [api.stations.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.stations.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Station not found");
      return api.stations.get.responses[200].parse(await res.json());
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useCreateStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertStation) => {
      // Ensure numeric fields are actually numbers for the schema validation
      const payload = {
        ...data,
        lat: Number(data.lat),
        lng: Number(data.lng),
        powerKw: data.powerKw ? Number(data.powerKw) : undefined,
      };
      
      const validated = api.stations.create.input.parse(payload);
      
      const res = await fetch(api.stations.create.path, {
        method: api.stations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create station");
      }
      return api.stations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
    },
  });
}

// --- Reports Hooks ---

export function useStationReports(stationId: number) {
  return useQuery({
    queryKey: [api.stations.getReports.path, stationId],
    queryFn: async () => {
      const url = buildUrl(api.stations.getReports.path, { id: stationId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return api.stations.getReports.responses[200].parse(await res.json());
    },
    enabled: !!stationId && !isNaN(stationId),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertReport) => {
      const validated = api.reports.create.input.parse(data);
      const res = await fetch(api.reports.create.path, {
        method: api.reports.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to submit report");
      return api.reports.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.stations.getReports.path, variables.stationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [api.stations.get.path, variables.stationId] 
      });
    },
  });
}
