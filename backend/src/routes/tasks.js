import { Router } from "express";
import { z } from "zod";

const MAX_PAGE_SIZE = 100;
const MAX_OFFSET = 1_000_000;
const MAX_TASK_LENGTH = 5_000;

const listQuerySchema = z
  .object({
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(MAX_PAGE_SIZE))
      .optional()
      .default(100),
    offset: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().min(0).max(MAX_OFFSET))
      .optional()
      .default(0),
  })
  .strict();

const createTaskSchema = z
  .object({
    text: z.string().trim().min(1).max(MAX_TASK_LENGTH),
  })
  .strict();

const completionSchema = z
  .object({
    completed: z.boolean(),
  })
  .strict();

function sendValidationError(res, error) {
  const issue = error.issues[0];
  const field = issue.path.length > 0 ? issue.path.join(".") : "request";

  return res.status(400).json({
    error: {
      code: "INVALID_REQUEST",
      message: `${field}: ${issue.message}`,
    },
  });
}

function sendTaskNotFound(res) {
  return res.status(404).json({
    error: {
      code: "TASK_NOT_FOUND",
      message: "Task not found.",
    },
  });
}

export function createTasksRouter(repository) {
  const router = Router();

  router.get("/", async (req, res) => {
    const result = listQuerySchema.safeParse(req.query);

    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    const page = await repository.list(result.data);
    return res.status(200).json(page);
  });

  router.post("/", async (req, res) => {
    const result = createTaskSchema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    const task = await repository.create(result.data.text);
    return res.status(201).json(task);
  });

  router.patch("/:id", async (req, res) => {
    const result = completionSchema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    const task = await repository.setCompleted(
      req.params.id,
      result.data.completed,
    );

    if (!task) {
      return sendTaskNotFound(res);
    }

    return res.status(200).json(task);
  });

  router.delete("/:id", async (req, res) => {
    const deleted = await repository.delete(req.params.id);

    if (!deleted) {
      return sendTaskNotFound(res);
    }

    return res.status(204).end();
  });

  return router;
}
