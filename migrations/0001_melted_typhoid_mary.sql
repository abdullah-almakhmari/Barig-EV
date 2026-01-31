CREATE TABLE "charger_rentals" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"owner_id" varchar NOT NULL,
	"is_available_for_rent" boolean DEFAULT true,
	"price_per_kwh" real NOT NULL,
	"currency" text DEFAULT 'OMR',
	"min_session_minutes" integer DEFAULT 0,
	"max_session_minutes" integer,
	"requires_approval" boolean DEFAULT false,
	"description" text,
	"description_ar" text,
	"total_earnings" real DEFAULT 0,
	"total_sessions_count" integer DEFAULT 0,
	"total_energy_kwh" real DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"user_name" text,
	"user_email" text,
	"user_phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'unread',
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tesla_connectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"device_token" text NOT NULL,
	"device_name" text,
	"charger_ip" text,
	"is_online" boolean DEFAULT false,
	"last_seen" timestamp,
	"last_vitals" text,
	"current_session_id" integer,
	"user_vehicle_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_vehicles" ALTER COLUMN "ev_vehicle_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "screenshot_path" text;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "is_auto_tracked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "grid_voltage" real;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "grid_frequency" real;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "max_current_a" real;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "avg_current_a" real;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "max_power_kw" real;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "max_temp_c" real;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "tesla_connector_id" integer;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "is_rental_session" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "rental_price_per_kwh" real;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "rental_total_cost" real;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "rental_owner_id" varchar;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "description_ar" text;