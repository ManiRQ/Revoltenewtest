import { createServer } from "./server.js";
import { migrateDatabase } from "./db/migrate.js";
import { seedDatabase } from "./db/seed.js";

migrateDatabase();
seedDatabase();

const port = Number(process.env.PORT ?? 4174);
const app = createServer();
const server = app.listen(port, "0.0.0.0", () => {
  console.info(`DeskPilot API listening on port ${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
