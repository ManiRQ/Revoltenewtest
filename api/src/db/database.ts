import "dotenv/config";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";

const configuredUrl = process.env.DATABASE_URL ?? "file:./data/deskpilot.db";
const configuredPath = configuredUrl.startsWith("file:")
  ? configuredUrl.slice("file:".length)
  : configuredUrl;
const databasePath = isAbsolute(configuredPath)
  ? configuredPath
  : resolve(process.cwd(), configuredPath);

mkdirSync(dirname(databasePath), { recursive: true });

const globalDatabase = globalThis as typeof globalThis & {
  deskpilotSqlite?: Database.Database;
};

export const sqlite = globalDatabase.deskpilotSqlite ?? new Database(databasePath);

if (process.env.NODE_ENV !== "production") {
  globalDatabase.deskpilotSqlite = sqlite;
}

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);
export const sqlitePath = databasePath;
