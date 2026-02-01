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
  description: text("description"),
  descriptionAr: text("description_ar"),
  status: text("status").default("OPERATIONAL"),
  trustLevel: text("trust_level").default("NORMAL"),
  stationType: text("station_type").default("PUBLIC"),
  contactPhone: text("contact_phone"),
  contactWhatsapp: text("contact_whatsapp"),
  addedByUserId: varchar("added_by_user_id"),
  isHidden: boolean("is_hidden").default(false),
  approvalStatus: text("approval_status").default("APPROVED"), // PENDING, APPROVED, REJECTED
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Multiple chargers per station (supports AC + DC at same station)
export const stationChargers = pgTable("station_chargers", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull(),
  chargerType: text("charger_type").notNull(), // 'AC' or 'DC'
  powerKw: real("power_kw").notNull(),
  count: integer("count").default(1),
  availableCount: integer("available_count").default(1),
  connectorType: text("connector_type"), // 'Type 2', 'CCS', 'CHAdeMO', etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull(),
  userId: varchar("user_id"),
  status: text("status").notNull(),
  reason: text("reason"),
  reviewStatus: text("review_status").default("open"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
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
  evVehicleId: integer("ev_vehicle_id"),
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
  customVehicleName: text("custom_vehicle_name"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  energyKwh: real("energy_kwh"),
  batteryStartPercent: integer("battery_start_percent"),
  batteryEndPercent: integer("battery_end_percent"),
  screenshotPath: text("screenshot_path"),
  isActive: boolean("is_active").default(true),
  isAutoTracked: boolean("is_auto_tracked").default(false),
  gridVoltage: real("grid_voltage"),
  gridFrequency: real("grid_frequency"),
  maxCurrentA: real("max_current_a"),
  avgCurrentA: real("avg_current_a"),
  maxPowerKw: real("max_power_kw"),
  maxTempC: real("max_temp_c"),
  teslaConnectorId: integer("tesla_connector_id"),
  isRentalSession: boolean("is_rental_session").default(false),
  rentalPricePerKwh: real("rental_price_per_kwh"),
  rentalTotalCost: real("rental_total_cost"),
  rentalOwnerId: varchar("rental_owner_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community verification votes for station status
export const stationVerifications = pgTable("station_verifications", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull(),
  userId: varchar("user_id").notNull(),
  vote: text("vote").notNull(), // 'WORKING', 'NOT_WORKING', 'BUSY'
  createdAt: timestamp("created_at").defaultNow(),
});

// Contact messages from users to admin
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  userName: text("user_name"),
  userEmail: text("user_email"),
  userPhone: text("user_phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").default("unread"), // unread, read, replied
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ESP32 Tesla Connectors - links stations to ESP32 devices for automatic status updates
export const teslaConnectors = pgTable("tesla_connectors", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull(),
  userId: varchar("user_id").notNull(),
  deviceToken: text("device_token").notNull(), // Unique token for ESP32 authentication
  deviceName: text("device_name"), // e.g. "Home Charger"
  chargerIp: text("charger_ip"), // Tesla Wall Connector IP
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  lastVitals: text("last_vitals"), // JSON string of last received vitals
  currentSessionId: integer("current_session_id"), // Active charging session
  userVehicleId: integer("user_vehicle_id"), // Default vehicle for auto sessions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tesla Vitals Log - stores all vitals readings for data analytics
export const teslaVitalsLog = pgTable("tesla_vitals_log", {
  id: serial("id").primaryKey(),
  connectorId: integer("connector_id").notNull(),
  stationId: integer("station_id").notNull(),
  // Core status
  contactorClosed: boolean("contactor_closed"),
  vehicleConnected: boolean("vehicle_connected"),
  sessionS: integer("session_s"),
  sessionEnergyWh: real("session_energy_wh"),
  // Grid measurements
  gridV: real("grid_v"),
  gridHz: real("grid_hz"),
  // Current measurements (3-phase + neutral)
  vehicleCurrentA: real("vehicle_current_a"),
  currentAA: real("current_a_a"),
  currentBA: real("current_b_a"),
  currentCA: real("current_c_a"),
  currentNA: real("current_n_a"),
  // Voltage measurements (3-phase)
  voltageAV: real("voltage_a_v"),
  voltageBV: real("voltage_b_v"),
  voltageCV: real("voltage_c_v"),
  // Relay voltages
  relayK1V: real("relay_k1_v"),
  relayK2V: real("relay_k2_v"),
  // Temperature measurements
  pcbaTempC: real("pcba_temp_c"),
  handleTempC: real("handle_temp_c"),
  mcuTempC: real("mcu_temp_c"),
  // Pilot signal
  pilotHighV: real("pilot_high_v"),
  pilotLowV: real("pilot_low_v"),
  proxV: real("prox_v"),
  // System status
  uptimeS: integer("uptime_s"),
  inputThermopileUv: integer("input_thermopile_uv"),
  configStatus: integer("config_status"),
  evseState: integer("evse_state"),
  // Alerts and reasons (stored as JSON strings)
  currentAlerts: text("current_alerts"), // JSON array
  evseNotReadyReasons: text("evse_not_ready_reasons"), // JSON array
  // Timestamp
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Home charger rental settings - allows users to rent out their home chargers
export const chargerRentals = pgTable("charger_rentals", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull(),
  ownerId: varchar("owner_id").notNull(),
  isAvailableForRent: boolean("is_available_for_rent").default(true),
  pricePerKwh: real("price_per_kwh").notNull(), // Price in OMR per kWh
  currency: text("currency").default("OMR"),
  minSessionMinutes: integer("min_session_minutes").default(0),
  maxSessionMinutes: integer("max_session_minutes"),
  requiresApproval: boolean("requires_approval").default(false),
  description: text("description"),
  descriptionAr: text("description_ar"),
  totalEarnings: real("total_earnings").default(0),
  totalSessionsCount: integer("total_sessions_count").default(0),
  totalEnergyKwh: real("total_energy_kwh").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Charger ownership verification requests - for non-ESP32 chargers
export const ownershipVerifications = pgTable("ownership_verifications", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull(),
  userId: varchar("user_id").notNull(),
  verificationCode: text("verification_code").notNull(), // Random code user must display
  photoUrls: text("photo_urls"), // JSON array of uploaded photo URLs
  status: text("status").default("PENDING"), // PENDING, APPROVED, REJECTED
  rejectionReason: text("rejection_reason"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  expiresAt: timestamp("expires_at"), // Approval expires after 1 year
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trust events for idempotent rewards/penalties (persistent tracking)
// Uses row-level locking + sliding window query for idempotency
export const trustEvents = pgTable("trust_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  eventType: text("event_type").notNull(), // 'verification_reward', 'report_reward', 'contradiction_penalty'
  stationId: integer("station_id"), // null for user-level events like penalties
  reason: text("reason"), // for report rewards, the report reason
  delta: integer("delta").notNull(), // +1, +2, or -1
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStationSchema = createInsertSchema(stations).omit({ id: true, trustLevel: true, isHidden: true, approvalStatus: true, createdAt: true, updatedAt: true });
export const insertStationChargerSchema = createInsertSchema(stationChargers).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, reviewStatus: true, reviewedBy: true, reviewedAt: true, createdAt: true, updatedAt: true });
export const insertChargingSessionSchema = createInsertSchema(chargingSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEvVehicleSchema = createInsertSchema(evVehicles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserVehicleSchema = createInsertSchema(userVehicles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStationVerificationSchema = createInsertSchema(stationVerifications).omit({ id: true, createdAt: true });
export const insertTrustEventSchema = createInsertSchema(trustEvents).omit({ id: true, createdAt: true });
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, status: true, adminNotes: true, createdAt: true, updatedAt: true });
export const insertTeslaConnectorSchema = createInsertSchema(teslaConnectors).omit({ id: true, isOnline: true, lastSeen: true, lastVitals: true, currentSessionId: true, createdAt: true, updatedAt: true });
export const insertTeslaVitalsLogSchema = createInsertSchema(teslaVitalsLog).omit({ id: true, recordedAt: true });
export const insertChargerRentalSchema = createInsertSchema(chargerRentals).omit({ id: true, totalEarnings: true, totalSessionsCount: true, totalEnergyKwh: true, createdAt: true, updatedAt: true });
export const insertOwnershipVerificationSchema = createInsertSchema(ownershipVerifications).omit({ id: true, status: true, rejectionReason: true, reviewedBy: true, reviewedAt: true, expiresAt: true, createdAt: true, updatedAt: true });

export type Station = typeof stations.$inferSelect;
export type InsertStation = z.infer<typeof insertStationSchema>;
export type StationCharger = typeof stationChargers.$inferSelect;
export type InsertStationCharger = z.infer<typeof insertStationChargerSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type ChargingSession = typeof chargingSessions.$inferSelect;
export type InsertChargingSession = z.infer<typeof insertChargingSessionSchema>;
export type EvVehicle = typeof evVehicles.$inferSelect;
export type InsertEvVehicle = z.infer<typeof insertEvVehicleSchema>;
export type UserVehicle = typeof userVehicles.$inferSelect;
export type InsertUserVehicle = z.infer<typeof insertUserVehicleSchema>;
export type StationVerification = typeof stationVerifications.$inferSelect;
export type InsertStationVerification = z.infer<typeof insertStationVerificationSchema>;
export type TrustEvent = typeof trustEvents.$inferSelect;
export type InsertTrustEvent = z.infer<typeof insertTrustEventSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type TeslaConnector = typeof teslaConnectors.$inferSelect;
export type InsertTeslaConnector = z.infer<typeof insertTeslaConnectorSchema>;
export type TeslaVitalsLog = typeof teslaVitalsLog.$inferSelect;
export type InsertTeslaVitalsLog = z.infer<typeof insertTeslaVitalsLogSchema>;
export type ChargerRental = typeof chargerRentals.$inferSelect;
export type InsertChargerRental = z.infer<typeof insertChargerRentalSchema>;
export type OwnershipVerification = typeof ownershipVerifications.$inferSelect;
export type InsertOwnershipVerification = z.infer<typeof insertOwnershipVerificationSchema>;

// Tesla Wall Connector vitals from ESP32
export type TeslaVitals = {
  contactor_closed: boolean;
  vehicle_connected: boolean;
  session_s: number;
  grid_v: number;
  grid_hz: number;
  vehicle_current_a: number;
  current_a: number;
  current_b: number;
  current_c: number;
  pcba_temp_c: number;
  mcu_temp_c: number;
  handle_temp_c: number;
  contact_temp_c: number;
  session_energy_wh: number;
  uptime_s: number;
  config_status: number;
  user_control_state: number;
};

export type StationWithReports = Station & {
  reports?: Report[];
};

export type StationWithConnector = Station & {
  hasActiveConnector?: boolean;
};

export type UserVehicleWithDetails = UserVehicle & {
  evVehicle?: EvVehicle;
};

export type ChargingSessionWithVehicle = ChargingSession & {
  vehicle?: EvVehicle;
  userVehicle?: UserVehicleWithDetails;
};

export type RentalSessionWithDetails = ChargingSession & {
  renterName?: string;
  renterVehicle?: UserVehicleWithDetails;
  station?: Station;
};

export type ChargerRentalWithStats = ChargerRental & {
  station?: Station;
  recentSessions?: RentalSessionWithDetails[];
};

export type VerificationSummary = {
  working: number;
  notWorking: number;
  busy: number;
  totalVotes: number;
  leadingVote: 'WORKING' | 'NOT_WORKING' | 'BUSY' | null;
  isVerified: boolean;
  isStrongVerified: boolean;
  lastVerifiedAt: string | null; // ISO timestamp of most recent verification
};
