import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User trust levels for the Trust & Loyalty system
export type UserTrustLevel = "NEW" | "NORMAL" | "TRUSTED";

// User storage table with custom auth support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phoneNumber: varchar("phone_number"),
  phoneProvided: boolean("phone_provided").default(false),
  profileImageUrl: varchar("profile_image_url"),
  provider: varchar("provider").default("local"),
  providerId: varchar("provider_id"),
  emailVerified: boolean("email_verified").default(false),
  role: varchar("role").default("user"),
  trustScore: integer("trust_score").default(0),
  userTrustLevel: varchar("user_trust_level").default("NEW"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type SafeUser = Omit<User, "passwordHash">;
