import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function sendSuccess<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  return res.status(status).json({ success: false, error: { code, message } });
}

export const notFound: RequestHandler = (_req, res) => {
  sendError(res, 404, "NOT_FOUND", "This resource could not be found.");
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  void next;
  if (error instanceof HttpError) {
    sendError(res, error.status, error.code, error.message);
    return;
  }

  if (error instanceof ZodError) {
    sendError(
      res,
      400,
      "INVALID_INPUT",
      "Check the submitted information and try again.",
    );
    return;
  }

  console.error("DeskPilot API request failed:", error);
  sendError(
    res,
    500,
    "INTERNAL_ERROR",
    "The request could not be completed. Please try again.",
  );
};
