import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";

const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);

export function runMigrations(db) {
  return migrate(db, { migrationsFolder });
}
