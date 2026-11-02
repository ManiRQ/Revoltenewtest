import { createDatabase } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

const { client, db } = createDatabase(process.env.DATABASE_URL ?? undefined);

try {
  await runMigrations(db);
  console.info("Database migrations applied.");
} finally {
  client.close();
}
