import { RequestHandler } from "express";
import { ZodType } from "zod";

/** Parses untrusted request JSON and replaces it with validated data. */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return validate("body", schema);
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return validate("query", schema);
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return validate("params", schema);
}

function validate<T>(location: "body" | "query" | "params", schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[location]);
    if (!result.success) {
      return res.status(400).json({ error: `Invalid request ${location}` });
    }
    req[location] = result.data as never;
    return next();
  };
}
