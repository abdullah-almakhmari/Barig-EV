CREATE TABLE "charging_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"user_id" varchar,
	"user_vehicle_id" integer,
	"custom_vehicle_name" text,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"duration_minutes" integer,
	"energy_kwh" real,
	"battery_start_percent" integer,
	"battery_end_percent" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ev_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"brand_ar" text NOT NULL,
	"model_ar" text NOT NULL,
	"battery_capacity_kwh" real,
	"charger_type" text NOT NULL,
	"max_charging_power_kw" real,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"user_id" varchar,
	"status" text NOT NULL,
	"reason" text,
	"review_status" text DEFAULT 'open',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "station_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ar" text NOT NULL,
	"operator" text,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"charger_type" text NOT NULL,
	"power_kw" real,
	"charger_count" integer DEFAULT 1,
	"available_chargers" integer DEFAULT 1,
	"is_free" boolean DEFAULT true,
	"price_text" text,
	"city" text NOT NULL,
	"city_ar" text NOT NULL,
	"address" text,
	"status" text DEFAULT 'OPERATIONAL',
	"trust_level" text DEFAULT 'NORMAL',
	"station_type" text DEFAULT 'PUBLIC',
	"contact_phone" text,
	"contact_whatsapp" text,
	"added_by_user_id" varchar,
	"is_hidden" boolean DEFAULT false,
	"approval_status" text DEFAULT 'APPROVED',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trust_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"station_id" integer,
	"reason" text,
	"delta" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"ev_vehicle_id" integer NOT NULL,
	"nickname" text,
	"license_plate" text,
	"color" text,
	"year" integer,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password_hash" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"phone_number" varchar,
	"phone_provided" boolean DEFAULT false,
	"profile_image_url" varchar,
	"provider" varchar DEFAULT 'local',
	"provider_id" varchar,
	"email_verified" boolean DEFAULT false,
	"role" varchar DEFAULT 'user',
	"trust_score" integer DEFAULT 0,
	"user_trust_level" varchar DEFAULT 'NEW',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");