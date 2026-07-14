import { Elysia } from "elysia";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../utils/api-error";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validationMiddleware(schemas: ValidationSchemas) {
  return (app: Elysia) =>
    app.onBeforeHandle({ as: "global" }, async ({ body, query, params }) => {
      const errors: { field: string; message: string }[] = [];

      if (schemas.body) {
        try {
          const result = schemas.body.parse(body);
          Object.assign(body || {}, result);
        } catch (err) {
          if (err instanceof ZodError) {
            errors.push(
              ...err.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message,
              }))
            );
          }
        }
      }

      if (schemas.query) {
        try {
          const result = schemas.query.parse(query);
          Object.assign(query || {}, result);
        } catch (err) {
          if (err instanceof ZodError) {
            errors.push(
              ...err.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message,
              }))
            );
          }
        }
      }

      if (schemas.params) {
        try {
          const result = schemas.params.parse(params);
          Object.assign(params || {}, result);
        } catch (err) {
          if (err instanceof ZodError) {
            errors.push(
              ...err.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message,
              }))
            );
          }
        }
      }

      if (errors.length > 0) {
        throw new ValidationError(
          "Los datos enviados no son válidos",
          errors
        );
      }
    });
}
