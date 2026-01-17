import { pgTable, text, serial, integer, boolean, timestamp, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth models (users and sessions tables)
export * from "./models/auth";

export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  operator: text("operator"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  chargerType: text("charger_type").notNull(), // 'AC', 'DC', 'Both'
  powerKw: real("power_kw"),
  chargerCount: integer("charger_count").default(1),
  availableChargers: integer("available_chargers").default(1),
  isFree: boolean("is_free").default(true),
  priceText: text("price_text"),
  city: text("city").notNull(),
  cityAr: text("city_ar").notNull(),
  address: text("address"),
  status: text("status").default("OPERATIONAL"),
  stationType: text("station_type").default("PUBLIC"),
  contactPhone: text("contact_phone"),
  contactWhatsapp: text("contact_whatsapp"),
  addedByUserId: varchar("added_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull(),
  userId: varchar("user_id"),
  status: text("status").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// EV vehicle catalog (reference data - all available EV models)
export const evVehicles = pgTable("ev_vehicles", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  brandAr: text("brand_ar").notNull(),
  modelAr: text("model_ar").notNull(),
  batteryCapacityKwh: real("battery_capacity_kwh"),
  chargerType: text("charger_type").notNull(),
  maxChargingPowerKw: real("max_charging_power_kw"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User's vehicles - links users to their owned vehicles
export const userVehicles = pgTable("user_vehicles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  evVehicleId: integer("ev_vehicle_id").notNull(),
  nickname: text("nickname"),
  licensePlate: text("license_plate"),
  color: text("color"),
  year: integer("year"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chargingSessions = pgTable("charging_sessions", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull(),
  userId: varchar("user_id"),
  userVehicleId: integer("user_vehicle_id"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  energyKwh: real("energy_kwh"),
  batteryStartPercent: integer("battery_start_percent"),
  batteryEndPercent: integer("battery_end_percent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStationSchema = createInsertSchema(stations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChargingSessionSchema = createInsertSchema(chargingSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEvVehicleSchema = createInsertSchema(evVehicles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserVehicleSchema = createInsertSchema(userVehicles).omit({ id: true, createdAt: true, updatedAt: true });

export type Station = typeof stations.$inferSelect;
export type InsertStation = z.infer<typeof insertStationSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type ChargingSession = typeof chargingSessions.$inferSelect;
export type InsertChargingSession = z.infer<typeof insertChargingSessionSchema>;
export type EvVehicle = typeof evVehicles.$inferSelect;
export type InsertEvVehicle = z.infer<typeof insertEvVehicleSchema>;
export type UserVehicle = typeof userVehicles.$inferSelect;
export type InsertUserVehicle = z.infer<typeof insertUserVehicleSchema>;

export type StationWithReports = Station & {
  reports?: Report[];
};

export type UserVehicleWithDetails = UserVehicle & {
  evVehicle?: EvVehicle;
};

export type ChargingSessionWithVehicle = ChargingSession & {
  vehicle?: EvVehicle;
  userVehicle?: UserVehicleWithDetails;
};
