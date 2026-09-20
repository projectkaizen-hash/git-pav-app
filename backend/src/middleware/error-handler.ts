import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Sensitive fields to redact from error logs and responses
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'refreshToken',
  'accessToken',
  'token',
  'secret',
  'apiKey',
  'apiSecret',
  'stripeSecret',
  'cardNumber',
  'cvv',
  'expiry',
  'ssn',
  'nhsNumber',
  'medicalRecordNumber',
  'phone',
  'email',
  'address',
  'postcode',
];

function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Log error with redacted sensitive data
  console.error(`[${requestId}] ${timestamp} ERROR:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: redactSensitiveData(req.body),
    query: redactSensitiveData(req.query),
  });

  // Return safe error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    requestId,
    timestamp,
    ...(isDevelopment && { stack: err.stack }),
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
