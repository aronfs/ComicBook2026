import { Elysia, NotFoundError as ElysiaNotFoundError } from "elysia";
import { apiError } from "../utils/api-response";

export const notFoundMiddleware = (app: Elysia) =>
  app.onError(({ code, set }) => {
    if (code === "NOT_FOUND") {
      set.status = 404;
      return apiError("Ruta no encontrada");
    }
  });
