import { Elysia, t } from "elysia";
import { adminController } from "../controllers/admin.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const checkRole = (role: string) => {
  return (ctx: any) => {
    if (!ctx.user) {
      ctx.set.status = 401;
      return { success: false, message: "No autorizado" };
    }
    if (ctx.user.role !== role && ctx.user.role !== "ADMIN") {
      if (role === "ADMIN") {
        ctx.set.status = 403;
        return {
          success: false,
          message: "No tienes permisos para realizar esta acción",
        };
      }
      if (role === "EDITOR" && ctx.user.role !== "EDITOR") {
        ctx.set.status = 403;
        return {
          success: false,
          message: "No tienes permisos para realizar esta acción",
        };
      }
    }
  };
};

export const adminRoutes = new Elysia()
  .use(authMiddleware)
  .group("/api/v1/admin", (app) => {
    // Admin-only user management
    const adminUsers = app.group("/users", (app) =>
      app
        .onBeforeHandle((ctx) => checkRole("ADMIN")(ctx))
        .get("/", (ctx) => adminController.getUsers(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Listar usuarios (ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
        .get("/:id", (ctx) => adminController.getUserById(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Obtener usuario por ID (ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
        .patch(
          "/:id/role",
          (ctx) => adminController.updateUserRole(ctx as any),
          {
            body: t.Object({
              role: t.Enum({
                USER: "USER",
                EDITOR: "EDITOR",
                ADMIN: "ADMIN",
              }),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Cambiar rol de usuario (ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .patch(
          "/:id/status",
          (ctx) => adminController.updateUserStatus(ctx as any),
          {
            body: t.Object({
              status: t.Enum({
                ACTIVE: "ACTIVE",
                INACTIVE: "INACTIVE",
                SUSPENDED: "SUSPENDED",
              }),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Cambiar estado de usuario (ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .delete("/:id", (ctx) => adminController.deleteUser(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Eliminar usuario (ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
    );

    // Editor/Admin comic management
    const adminComics = adminUsers.group("/comics", (app) =>
      app
        .onBeforeHandle((ctx) => checkRole("EDITOR")(ctx))
        .post(
          "/",
          (ctx) => adminController.createComic(ctx as any),
          {
            body: t.Object({
              title: t.String(),
              author: t.String(),
              publicationYear: t.Number(),
              comicTypeId: t.String(),
              originalTitle: t.Optional(t.String()),
              description: t.Optional(t.String()),
              synopsis: t.Optional(t.String()),
              illustrator: t.Optional(t.String()),
              publisher: t.Optional(t.String()),
              issueNumber: t.Optional(t.Number()),
              totalPages: t.Optional(t.Number()),
              language: t.Optional(t.String()),
              isbn: t.Optional(t.String()),
              coverImageUrl: t.Optional(t.String()),
              availability: t.Optional(
                t.Enum({
                  AVAILABLE: "AVAILABLE",
                  UNAVAILABLE: "UNAVAILABLE",
                  COMING_SOON: "COMING_SOON",
                })
              ),
              country: t.Optional(t.String()),
              ageRating: t.Optional(t.String()),
              edition: t.Optional(t.String()),
              volume: t.Optional(t.Number()),
              seriesName: t.Optional(t.String()),
              externalUrl: t.Optional(t.String()),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Crear cómic (EDITOR/ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .get("/", (ctx) => adminController.getComics(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Listar cómics (EDITOR/ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
        .get("/:id", (ctx) => adminController.getComicById(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Obtener cómic por ID (EDITOR/ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
        .put(
          "/:id",
          (ctx) => adminController.updateComic(ctx as any),
          {
            body: t.Object({
              title: t.Optional(t.String()),
              author: t.Optional(t.String()),
              publicationYear: t.Optional(t.Number()),
              comicTypeId: t.Optional(t.String()),
              originalTitle: t.Optional(t.String()),
              description: t.Optional(t.String()),
              synopsis: t.Optional(t.String()),
              illustrator: t.Optional(t.String()),
              publisher: t.Optional(t.String()),
              issueNumber: t.Optional(t.Number()),
              totalPages: t.Optional(t.Number()),
              language: t.Optional(t.String()),
              isbn: t.Optional(t.String()),
              coverImageUrl: t.Optional(t.String()),
              availability: t.Optional(
                t.Enum({
                  AVAILABLE: "AVAILABLE",
                  UNAVAILABLE: "UNAVAILABLE",
                  COMING_SOON: "COMING_SOON",
                })
              ),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Actualizar cómic (EDITOR/ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .patch(
          "/:id/status",
          (ctx) => adminController.updateComicStatus(ctx as any),
          {
            body: t.Object({
              status: t.Enum({
                DRAFT: "DRAFT",
                PUBLISHED: "PUBLISHED",
                ARCHIVED: "ARCHIVED",
              }),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Cambiar estado del cómic (ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .patch(
          "/:id/availability",
          (ctx) => adminController.updateComicAvailability(ctx as any),
          {
            body: t.Object({
              availability: t.Enum({
                AVAILABLE: "AVAILABLE",
                UNAVAILABLE: "UNAVAILABLE",
                COMING_SOON: "COMING_SOON",
              }),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Cambiar disponibilidad (EDITOR/ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .patch(
          "/:id/featured",
          (ctx) => adminController.updateComicFeatured(ctx as any),
          {
            body: t.Object({
              isFeatured: t.Boolean(),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Cambiar destacado (ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .post("/:id/publish", (ctx) => adminController.publishComic(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Publicar cómic (EDITOR/ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
        .post("/:id/archive", (ctx) => adminController.archiveComic(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Archivar cómic (EDITOR/ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
        .delete("/:id", (ctx) => adminController.deleteComic(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Eliminar cómic (ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
    );

    // Admin-only comic type management
    const adminComicTypes = adminComics.group("/comic-types", (app) =>
      app
        .onBeforeHandle((ctx) => checkRole("ADMIN")(ctx))
        .post(
          "/",
          (ctx) => adminController.createComicType(ctx as any),
          {
            body: t.Object({
              name: t.String(),
              description: t.Optional(t.String()),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Crear tipo de cómic (ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .put(
          "/:id",
          (ctx) => adminController.updateComicType(ctx as any),
          {
            body: t.Object({
              name: t.Optional(t.String()),
              description: t.Optional(t.String()),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Actualizar tipo de cómic (ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .patch(
          "/:id/status",
          (ctx) => adminController.toggleComicTypeStatus(ctx as any),
          {
            body: t.Object({
              isActive: t.Boolean(),
            }),
            detail: {
              tags: ["Admin"],
              summary: "Activar/desactivar tipo (ADMIN)",
              security: [{ bearerAuth: [] }],
            },
          }
        )
        .delete("/:id", (ctx) => adminController.deleteComicType(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Eliminar tipo de cómic (ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
    );

    // Audit logs - Admin only
    const auditLogsGroup = adminComicTypes.group("", (app) =>
      app
        .onBeforeHandle((ctx) => checkRole("ADMIN")(ctx))
        .get("/audit-logs", (ctx) => adminController.getAuditLogs(ctx as any), {
          detail: {
            tags: ["Admin"],
            summary: "Obtener logs de auditoría (ADMIN)",
            security: [{ bearerAuth: [] }],
          },
        })
    );

    return auditLogsGroup;
  });
