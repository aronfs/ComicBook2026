import { Elysia, t } from "elysia";
import {
  authController,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export const authRoutes = new Elysia()
  .group("/api/v1/auth", (app) =>
    app
      .post(
        "/register",
        ({ body, request }) => authController.register({ body, request }),
        {
          body: t.Object({
            firstName: t.String(),
            lastName: t.String(),
            username: t.String(),
            email: t.String(),
            password: t.String(),
          }),
          detail: {
            tags: ["Auth"],
            summary: "Registrar un nuevo usuario",
          },
        }
      )
      .post(
        "/login",
        ({ body, request }) => authController.login({ body, request }),
        {
          body: t.Object({
            email: t.String(),
            password: t.String(),
          }),
          detail: {
            tags: ["Auth"],
            summary: "Iniciar sesión",
          },
        }
      )
      .post(
        "/refresh",
        ({ body, request }) => authController.refresh({ body, request }),
        {
          body: t.Object({
            refreshToken: t.String(),
          }),
          detail: {
            tags: ["Auth"],
            summary: "Renovar token de acceso",
          },
        }
      )
      .use(authMiddleware)
      .post("/logout", (ctx) => authController.logout(ctx as any), {
        detail: {
          tags: ["Auth"],
          summary: "Cerrar sesión",
          security: [{ bearerAuth: [] }],
        },
      })
      .post("/logout-all", (ctx) => authController.logoutAll(ctx as any), {
        detail: {
          tags: ["Auth"],
          summary: "Cerrar todas las sesiones",
          security: [{ bearerAuth: [] }],
        },
      })
      .get("/me", (ctx) => authController.me(ctx as any), {
        detail: {
          tags: ["Auth"],
          summary: "Obtener perfil del usuario autenticado",
          security: [{ bearerAuth: [] }],
        },
      })
  );
