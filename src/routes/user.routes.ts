import { Elysia, t } from "elysia";
import { userController } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export const userRoutes = new Elysia()
  .use(authMiddleware)
  .group("/api/v1/users", (app) =>
    app
      .get("/me", (ctx) => userController.getProfile(ctx as any), {
        detail: {
          tags: ["Users"],
          summary: "Obtener mi perfil",
          security: [{ bearerAuth: [] }],
        },
      })
      .put(
        "/me",
        ({ user, body }) => userController.updateProfile({ user: user!, body }),
        {
          body: t.Object({
            firstName: t.Optional(t.String()),
            lastName: t.Optional(t.String()),
            username: t.Optional(t.String()),
            avatarUrl: t.Optional(t.String()),
          }),
          detail: {
            tags: ["Users"],
            summary: "Actualizar mi perfil",
            security: [{ bearerAuth: [] }],
          },
        }
      )
      .patch(
        "/me/password",
        ({ user, body }) =>
          userController.changePassword({ user: user!, body }),
        {
          body: t.Object({
            currentPassword: t.String(),
            newPassword: t.String(),
          }),
          detail: {
            tags: ["Users"],
            summary: "Cambiar mi contraseña",
            security: [{ bearerAuth: [] }],
          },
        }
      )
      .delete("/me", (ctx) => userController.deleteAccount(ctx as any), {
        detail: {
          tags: ["Users"],
          summary: "Eliminar mi cuenta",
          security: [{ bearerAuth: [] }],
        },
      })
      .get("/me/favorites", (ctx) => userController.getFavorites(ctx as any), {
        detail: {
          tags: ["Users"],
          summary: "Obtener mis favoritos",
          security: [{ bearerAuth: [] }],
        },
      })
  );
