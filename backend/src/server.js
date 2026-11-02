import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createApp } from "./app.js";
import { createDatabase } from "./db/client.js";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const { client, db } = createDatabase(
  process.env.DATABASE_URL ?? "file:./data/tasks.sqlite",
);

await migrate(db, { migrationsFolder });

const app = createApp({ db });
const server = app.listen(port, host, () => {
  console.info(`To-Do API listening on ${host}:${port}`);
});

function shutdown(signal) {
  console.info(`Received ${signal}; shutting down.`);

  server.close((error) => {
    client.close();

    if (error) {
      console.error("Failed to close the HTTP server cleanly.", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
