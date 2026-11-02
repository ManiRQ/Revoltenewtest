import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const defaultDatabaseUrl = "file:./data/tasks.sqlite";

export function createDatabase(databaseUrl = defaultDatabaseUrl) {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });

  const client = createClient({ url: databaseUrl });
  const db = drizzle(client, { schema });

  return { client, db };
}
