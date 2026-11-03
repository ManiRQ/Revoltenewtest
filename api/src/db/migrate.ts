import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./database.js";

export function migrateDatabase() {
  migrate(db, { migrationsFolder: "./drizzle" });
}
