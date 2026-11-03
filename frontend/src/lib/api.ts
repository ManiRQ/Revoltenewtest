import type { ApiEnvelope, ApiErrorEnvelope } from "../types";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "REQUEST_FAILED") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function isErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.success !== false || !record.error || typeof record.error !== "object") {
    return false;
  }
  const error = record.error as Record<string, unknown>;
  return typeof error.message === "string" && typeof error.code === "string";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError("The server returned an unreadable response.", response.status);
  }

  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      throw new ApiError(payload.error.message, response.status, payload.error.code);
    }

    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    if ((payload as ApiEnvelope<T>).success === true && "data" in payload) {
      return (payload as ApiEnvelope<T>).data;
    }
  }

  return payload as T;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
