// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";

  if (statusCode >= 500) {
    logger.error(`[SERVER ERROR] ${message}`, { stack: err.stack });
  }

  // Construcción explícita para evitar warnings de spread condicional con unknown
  const errorResponse: { error: { message: string; details?: unknown } } = {
    error: { message },
  };

  if (err instanceof AppError && err.details) {
    errorResponse.error.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
};
