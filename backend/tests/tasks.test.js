import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import test from "node:test";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createApp } from "../src/app.js";
import { createDatabase } from "../src/db/client.js";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

async function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
}

async function stopServer(server) {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

test("task API validates requests and persists task changes", async () => {
  const databasePath = resolve("data", `tasks-${randomUUID()}.sqlite`);
  const databaseUrl = pathToFileURL(databasePath).href;
  let database = createDatabase(databaseUrl);
  let server;

  try {
    await migrate(database.db, { migrationsFolder });
    server = await startServer(createApp({ db: database.db }));

    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const initialList = await requestJson(baseUrl, "/tasks");
    assert.equal(initialList.response.status, 200);
    assert.deepEqual(initialList.body, {
      tasks: [],
      total: 0,
      limit: 100,
      offset: 0,
    });

    const invalidPage = await requestJson(baseUrl, "/tasks?limit=101");
    assert.equal(invalidPage.response.status, 400);
    assert.equal(invalidPage.body.error.code, "INVALID_REQUEST");

    const invalidOffset = await requestJson(baseUrl, "/tasks?offset=-1");
    assert.equal(invalidOffset.response.status, 400);

    const missingTaskText = await requestJson(baseUrl, "/tasks", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(missingTaskText.response.status, 400);

    const nonStringTaskText = await requestJson(baseUrl, "/tasks", {
      method: "POST",
      body: JSON.stringify({ text: 123 }),
    });
    assert.equal(nonStringTaskText.response.status, 400);

    const blankTask = await requestJson(baseUrl, "/tasks", {
      method: "POST",
      body: JSON.stringify({ text: "   " }),
    });
    assert.equal(blankTask.response.status, 400);

    const oversizedBody = await requestJson(baseUrl, "/tasks", {
      method: "POST",
      body: JSON.stringify({ text: "x".repeat(9_000) }),
    });
    assert.equal(oversizedBody.response.status, 413);
    assert.equal(oversizedBody.body.error.code, "PAYLOAD_TOO_LARGE");

    const malformedJson = await requestJson(baseUrl, "/tasks", {
      method: "POST",
      body: "{",
    });
    assert.equal(malformedJson.response.status, 400);
    assert.equal(malformedJson.body.error.code, "INVALID_JSON");

    const firstTaskResponse = await requestJson(baseUrl, "/tasks", {
      method: "POST",
      body: JSON.stringify({ text: "  Draft the API  " }),
    });
    assert.equal(firstTaskResponse.response.status, 201);
    assert.equal(firstTaskResponse.body.text, "Draft the API");
    assert.equal(firstTaskResponse.body.completed, false);

    const firstTask = firstTaskResponse.body;
    const secondTaskResponse = await requestJson(baseUrl, "/tasks", {
      method: "POST",
      body: JSON.stringify({ text: "Review the routes" }),
    });
    assert.equal(secondTaskResponse.response.status, 201);

    const page = await requestJson(baseUrl, "/tasks?limit=1&offset=1");
    assert.equal(page.response.status, 200);
    assert.equal(page.body.total, 2);
    assert.equal(page.body.limit, 1);
    assert.equal(page.body.offset, 1);
    assert.equal(page.body.tasks.length, 1);

    const completedTask = await requestJson(baseUrl, `/tasks/${firstTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: true }),
    });
    assert.equal(completedTask.response.status, 200);
    assert.equal(completedTask.body.completed, true);

    const reopenedTask = await requestJson(baseUrl, `/tasks/${firstTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: false }),
    });
    assert.equal(reopenedTask.response.status, 200);
    assert.equal(reopenedTask.body.completed, false);

    const invalidCompletion = await requestJson(
      baseUrl,
      `/tasks/${firstTask.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ completed: "true" }),
      },
    );
    assert.equal(invalidCompletion.response.status, 400);

    const missingTask = await requestJson(baseUrl, "/tasks/missing-id", {
      method: "PATCH",
      body: JSON.stringify({ completed: true }),
    });
    assert.equal(missingTask.response.status, 404);
    assert.equal(missingTask.body.error.code, "TASK_NOT_FOUND");

    const deletedTask = await requestJson(
      baseUrl,
      `/tasks/${secondTaskResponse.body.id}`,
      { method: "DELETE" },
    );
    assert.equal(deletedTask.response.status, 204);
    assert.equal(deletedTask.body, null);

    const missingDelete = await requestJson(baseUrl, "/tasks/missing-id", {
      method: "DELETE",
    });
    assert.equal(missingDelete.response.status, 404);

    const persistedTaskResponse = await requestJson(baseUrl, "/tasks", {
      method: "POST",
      body: JSON.stringify({ text: "Persist across restart" }),
    });
    assert.equal(persistedTaskResponse.response.status, 201);

    await stopServer(server);
    server = null;
    database.client.close();

    database = createDatabase(databaseUrl);
    await migrate(database.db, { migrationsFolder });
    server = await startServer(createApp({ db: database.db }));

    const afterRestart = await requestJson(
      `http://127.0.0.1:${server.address().port}`,
      "/tasks",
    );
    assert.equal(afterRestart.response.status, 200);
    assert.equal(afterRestart.body.total, 2);
    assert.ok(
      afterRestart.body.tasks.some(
        (task) => task.text === "Persist across restart",
      ),
    );
    assert.ok(afterRestart.body.tasks.some((task) => task.id === firstTask.id));
  } finally {
    await stopServer(server);
    database.client.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}-shm`, { force: true });
    rmSync(`${databasePath}-wal`, { force: true });
  }
});
