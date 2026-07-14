import { Elysia } from "elysia";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError } from "../utils/api-error";
import type { AuthUser } from "../types/context.types";

export const authMiddleware = (app: Elysia) =>
  app.derive(async ({ headers, request }) => {
    const authHeader = headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Token de acceso no proporcionado");
    }

    const token = authHeader.slice(7);
    try {
      const payload = await verifyAccessToken(token);
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role as AuthUser["role"],
        sessionId: payload.sessionId,
      };
      return { user };
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      const message =
        (error as Error).message === "Token expirado"
          ? "Token expirado"
          : "Token inválido";
      throw new UnauthorizedError(message);
    }
  });
