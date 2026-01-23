import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertStation, InsertReport, ChargingSession, EvVehicle, UserVehicleWithDetails, InsertUserVehicle } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

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
        chargerCount: data.chargerCount ? Number(data.chargerCount) : 1,
        availableChargers: data.availableChargers ? Number(data.availableChargers) : 1,
      };
      
      const validated = api.stations.create.input.parse(payload);
      
      const res = await apiRequest(api.stations.create.method, api.stations.create.path, validated);
      
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
      const res = await apiRequest(api.reports.create.method, api.reports.create.path, validated);

      return api.reports.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.stations.getReports.path, variables.stationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [api.stations.get.path, variables.stationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [api.stations.list.path] 
      });
      // Invalidate admin reports cache so new reports appear in Admin Panel
      queryClient.invalidateQueries({ 
        queryKey: ["/api/admin/reports"] 
      });
    },
  });
}

export function useStartCharging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stationId: number) => {
      const url = buildUrl(api.stations.startCharging.path, { id: stationId });
      const res = await apiRequest(api.stations.startCharging.method, url);
      return res.json();
    },
    onSuccess: (_, stationId) => {
      queryClient.invalidateQueries({ queryKey: [api.stations.get.path, stationId] });
      queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
    },
  });
}

export function useStopCharging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stationId: number) => {
      const url = buildUrl(api.stations.stopCharging.path, { id: stationId });
      const res = await apiRequest(api.stations.stopCharging.method, url);
      return res.json();
    },
    onSuccess: (_, stationId) => {
      queryClient.invalidateQueries({ queryKey: [api.stations.get.path, stationId] });
      queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
    },
  });
}

// --- Charging Sessions Hooks ---

export function useChargingSessions(stationId?: number) {
  return useQuery({
    queryKey: [api.chargingSessions.list.path, stationId],
    queryFn: async () => {
      const url = new URL(api.chargingSessions.list.path, window.location.origin);
      if (stationId) url.searchParams.append("stationId", String(stationId));
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch charging sessions");
      return res.json() as Promise<ChargingSession[]>;
    },
  });
}

export function useActiveSession(stationId: number) {
  return useQuery({
    queryKey: [api.chargingSessions.getActive.path, stationId],
    queryFn: async () => {
      const url = buildUrl(api.chargingSessions.getActive.path, { id: stationId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active session");
      return res.json() as Promise<ChargingSession | null>;
    },
    enabled: !!stationId && !isNaN(stationId),
  });
}

export function useStartChargingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { stationId: number; userVehicleId?: number; customVehicleName?: string; batteryStartPercent?: number }) => {
      const res = await apiRequest("POST", api.chargingSessions.start.path, data);
      return res.json() as Promise<ChargingSession>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.stations.get.path, variables.stationId] });
      queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.chargingSessions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.chargingSessions.getActive.path, variables.stationId] });
    },
  });
}

export function useEndChargingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { sessionId: number; stationId: number; batteryEndPercent?: number; energyKwh?: number }) => {
      const url = buildUrl(api.chargingSessions.end.path, { id: data.sessionId });
      const res = await apiRequest("POST", url, { batteryEndPercent: data.batteryEndPercent, energyKwh: data.energyKwh });
      return res.json() as Promise<ChargingSession>;
    },
    onSuccess: (_, variables) => {
      // Invalidate all station-related queries to refresh map and details
      queryClient.invalidateQueries({ queryKey: [api.stations.get.path, variables.stationId] });
      queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.chargingSessions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.chargingSessions.getActive.path, variables.stationId] });
      // Also invalidate verification summary to update status display
      queryClient.invalidateQueries({ queryKey: ['/api/stations', variables.stationId, 'verification-summary'] });
    },
  });
}

// --- Vehicles Hooks ---

export function useVehicles() {
  return useQuery({
    queryKey: [api.vehicles.list.path],
    queryFn: async () => {
      const res = await fetch(api.vehicles.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json() as Promise<EvVehicle[]>;
    },
  });
}

export function useVehicle(id: number) {
  return useQuery({
    queryKey: [api.vehicles.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.vehicles.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Vehicle not found");
      return res.json() as Promise<EvVehicle>;
    },
    enabled: !!id && !isNaN(id),
  });
}

// --- User Vehicles Hooks ---

export function useUserVehicles() {
  return useQuery({
    queryKey: [api.userVehicles.list.path],
    queryFn: async () => {
      const res = await fetch(api.userVehicles.list.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return []; // Not logged in
        throw new Error("Failed to fetch user vehicles");
      }
      return res.json() as Promise<UserVehicleWithDetails[]>;
    },
  });
}

export function useCreateUserVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertUserVehicle, "userId">) => {
      const res = await apiRequest("POST", api.userVehicles.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.userVehicles.list.path] });
    },
  });
}

export function useDeleteUserVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vehicleId: number) => {
      const url = buildUrl(api.userVehicles.delete.path, { id: vehicleId });
      const res = await apiRequest("DELETE", url);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.userVehicles.list.path] });
    },
  });
}

export function useSetDefaultUserVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vehicleId: number) => {
      const url = buildUrl(api.userVehicles.setDefault.path, { id: vehicleId });
      const res = await apiRequest("POST", url);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.userVehicles.list.path] });
    },
  });
}
