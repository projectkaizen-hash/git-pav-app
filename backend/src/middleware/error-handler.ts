import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { safeError } from "../lib/log-safety";

/**
 * Error carrying an intended HTTP status. Thrown by helpers (e.g. missing
 * operator profile) so express-async-errors routes it here and the client
 * gets a meaningful status instead of a blanket 500.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Never log request bodies or query values: they carry names, clinical
  // notes, triage answers and contact details (EH-1, P0-3). Field names are
  // enough to see what shape of request failed.
  console.error(`[${requestId}] ${timestamp} ERROR:`, {
    ...safeError(err),
    path: req.path,
    method: req.method,
    bodyFields: req.body && typeof req.body === "object" ? Object.keys(req.body) : [],
    queryFields: Object.keys(req.query ?? {}),
  });

  // HttpErrors carry our own user-facing message; anything else is treated as
  // an internal failure and only exposes its message outside production.
  const isHttpError = err instanceof HttpError;
  const status = isHttpError ? err.status : 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(status).json({
    error: isHttpError ? err.message : isDevelopment ? err.message : 'Internal server error',
    requestId,
    timestamp,
    ...(isDevelopment && !isHttpError && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  res.status(404).json({
    error: 'Not found',
    requestId,
    timestamp,
    path: req.path,
  });
}

export function standardResponse(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Add request ID and timestamp to successful responses if data is a plain object
    if (res.statusCode >= 200 && res.statusCode < 300 && typeof data === "object" && data !== null && !Array.isArray(data)) {
      return originalJson({
        ...data,
        requestId,
        timestamp,
      });
    }
    
    return originalJson(data);
  };
  
  next();
}
