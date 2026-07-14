import { Elysia } from "elysia";
import { ApiError } from "../utils/api-error";
import { apiError } from "../utils/api-response";
import { Prisma } from "@prisma/client";
import { config } from "../config/env";

export const errorMiddleware = (app: Elysia) =>
  app.onError(({ error, set }) => {
    if (error instanceof ApiError) {
      set.status = error.statusCode;
      return apiError(error.message, error.errors);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = (error.meta?.target as string[]) || [];
        set.status = 409;
        return apiError(
          `El valor ya existe: ${target.join(", ")}`,
          target.map((field) => ({
            field,
            message: `El campo ${field} ya se encuentra registrado`,
          }))
        );
      }
      if (error.code === "P2025") {
        set.status = 404;
        return apiError("Registro no encontrado");
      }
      if (error.code === "P2003") {
        set.status = 400;
        return apiError("Referencia inválida");
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      set.status = 400;
      return apiError("Datos inválidos enviados a la base de datos");
    }

    const errorObj = error as Error;
    const message =
      config.nodeEnv === "production"
        ? "Error interno del servidor"
        : errorObj.message || "Error interno del servidor";

    set.status = 500;
    console.error(`[ERROR] ${errorObj.message || error}`);
    return apiError(message);
  });
