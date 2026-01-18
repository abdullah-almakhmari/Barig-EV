import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// نفضّل override إذا موجود
const databaseUrl =
  process.env.OVERRIDE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or OVERRIDE_DATABASE_URL must be set."
  );
}
console.log("OVERRIDE_DATABASE_URL exists?", !!process.env.OVERRIDE_DATABASE_URL);
console.log("DATABASE_URL starts with:", (process.env.DATABASE_URL || "").slice(0, 25));
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

// تأكد من إغلاق الاتصال عند الخروج