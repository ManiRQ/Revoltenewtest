import express from "express";
import { createTaskRepository } from "./repositories/task-repository.js";
import { createTasksRouter } from "./routes/tasks.js";

export function createApp({ db }) {
  const app = express();
  const taskRepository = createTaskRepository(db);

  app.disable("x-powered-by");
  app.use(express.json({ limit: "8kb" }));
  app.use("/tasks", createTasksRouter(taskRepository));

  app.use((req, res) => {
    return res.status(404).json({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Route not found.",
      },
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error.type === "entity.parse.failed") {
      return res.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "Request body must contain valid JSON.",
        },
      });
    }

    if (error.type === "entity.too.large") {
      return res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request body exceeds the 8 KB limit.",
        },
      });
    }

    if (
      error.type === "charset.unsupported" ||
      error.type === "encoding.unsupported"
    ) {
      return res.status(415).json({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Request body encoding is not supported.",
        },
      });
    }

    console.error("Unhandled API error", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  });

  return app;
}
