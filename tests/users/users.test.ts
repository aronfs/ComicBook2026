import { describe, it, expect } from "bun:test";
import { Elysia, t } from "elysia";
import {
  ApiError,
  NotFoundError,
  ForbiddenError,
} from "../../src/utils/api-error";

function createTestApp() {
  const app = new Elysia();

  app.onError(({ error, set, code }) => {
    if (error instanceof ApiError) {
      set.status = error.statusCode;
      return { success: false, message: error.message };
    }
    if ((error as any)?.status === 422 || code === "VALIDATION") {
      set.status = 422;
      return {
        success: false,
        message: "Error de validación",
        errors: (error as any)?.all || [],
      };
    }
    set.status = 500;
    return { success: false, message: "Error interno del servidor" };
  });

  function authGuard(app: Elysia) {
    return app.derive(async ({ headers }) => {
      const auth = headers.authorization || "";
      if (!auth.startsWith("Bearer ")) {
        throw new ApiError(401, "Token de acceso no proporcionado");
      }
      const token = auth.slice(7);
      if (token === "expired-token" || token === "invalid-token") {
        throw new ApiError(401, "Token inválido");
      }
      const roleHint = token.includes("admin")
        ? ("ADMIN" as const)
        : token.includes("editor")
          ? ("EDITOR" as const)
          : ("USER" as const);
      return {
        user: {
          id: roleHint === "ADMIN" ? "admin-user-id" : "mock-user-id",
          email: roleHint === "ADMIN" ? "admin@test.com" : "user@test.com",
          role: roleHint,
          sessionId: "mock-session-id",
        },
      };
    });
  }

  const usersStore: Map<
    string,
    {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      role: string;
      status: string;
      avatarUrl: string | null;
      createdAt: string;
      lastLoginAt: string | null;
    }
  > = new Map();

  const adminUserId = "admin-user-id";
  usersStore.set(adminUserId, {
    id: adminUserId,
    firstName: "Admin",
    lastName: "User",
    username: "admin",
    email: "admin@test.com",
    role: "ADMIN",
    status: "ACTIVE",
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  });

  const editorUserId = "editor-user-id";
  usersStore.set(editorUserId, {
    id: editorUserId,
    firstName: "Editor",
    lastName: "User",
    username: "editor",
    email: "editor@test.com",
    role: "EDITOR",
    status: "ACTIVE",
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  });

  const regularUserId = "regular-user-id";
  usersStore.set(regularUserId, {
    id: regularUserId,
    firstName: "Regular",
    lastName: "User",
    username: "regularuser",
    email: "regular@test.com",
    role: "USER",
    status: "ACTIVE",
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  });

  // --- Admin user management routes ---

  const adminGroup = new Elysia()
    .use(authGuard)
    .group("/api/v1/admin/users", (g) =>
      g
        .onBeforeHandle(({ user }: { user?: any }) => {
          if (!user) throw new ApiError(401, "No autorizado");
          if (user.role !== "ADMIN") {
            throw new ForbiddenError(
              "No tienes permisos para realizar esta acción",
            );
          }
        })
        .get("/", ({ query }: { query: any }) => {
          const page = parseInt(query.page as string) || 1;
          const limit = parseInt(query.limit as string) || 20;
          const search = (query.search as string) || "";

          let filtered = Array.from(usersStore.values());
          if (search) {
            filtered = filtered.filter(
              (u) =>
                u.firstName.toLowerCase().includes(search.toLowerCase()) ||
                u.lastName.toLowerCase().includes(search.toLowerCase()) ||
                u.username.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase()),
            );
          }

          const total = filtered.length;
          const start = (page - 1) * limit;
          const users = filtered.slice(start, start + limit);

          return {
            success: true,
            message: "Usuarios obtenidos exitosamente",
            data: users,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasNextPage: page < Math.ceil(total / limit),
              hasPreviousPage: page > 1,
            },
          };
        })
        .get("/:id", ({ params }: { params: { id: string } }) => {
          const user = usersStore.get(params.id);
          if (!user) {
            throw new NotFoundError("Usuario no encontrado");
          }
          return {
            success: true,
            message: "Usuario obtenido exitosamente",
            data: user,
          };
        })
        .patch(
          "/:id/role",
          ({ params, body }: { params: { id: string }; body: any }) => {
            const user = usersStore.get(params.id);
            if (!user) {
              throw new NotFoundError("Usuario no encontrado");
            }
            const updated = { ...user, role: body.role };
            usersStore.set(params.id, updated);
            return {
              success: true,
              message: "Rol de usuario actualizado exitosamente",
              data: updated,
            };
          },
          {
            body: t.Object({
              role: t.Enum({
                USER: "USER",
                EDITOR: "EDITOR",
                ADMIN: "ADMIN",
              }),
            }),
          },
        )
        .patch(
          "/:id/status",
          ({ params, body }: { params: { id: string }; body: any }) => {
            const user = usersStore.get(params.id);
            if (!user) {
              throw new NotFoundError("Usuario no encontrado");
            }
            const updated = { ...user, status: body.status };
            usersStore.set(params.id, updated);
            return {
              success: true,
              message: "Estado de usuario actualizado exitosamente",
              data: updated,
            };
          },
          {
            body: t.Object({
              status: t.Enum({
                ACTIVE: "ACTIVE",
                INACTIVE: "INACTIVE",
                SUSPENDED: "SUSPENDED",
              }),
            }),
          },
        )
        .delete("/:id", ({ params }: { params: { id: string } }) => {
          const user = usersStore.get(params.id);
          if (!user) {
            throw new NotFoundError("Usuario no encontrado");
          }
          usersStore.delete(params.id);
          return {
            success: true,
            message: "Usuario eliminado exitosamente",
            data: null,
          };
        }),
    );

  app.use(adminGroup);

  // --- Also add some user profile routes to test authenticated access ---
  const userGroup = new Elysia()
    .use(authGuard)
    .group("/api/v1/users", (g) =>
      g
        .get("/me", () => {
          return {
            success: true,
            message: "Perfil obtenido exitosamente",
            data: {
              id: "mock-user-id",
              firstName: "John",
              lastName: "Doe",
              username: "johndoe",
              email: "john@test.com",
              role: "USER",
              status: "ACTIVE",
              avatarUrl: null,
              createdAt: new Date().toISOString(),
            },
          };
        })
        .put(
          "/me",
          ({ body }: { body: any }) => {
            return {
              success: true,
              message: "Perfil actualizado exitosamente",
              data: {
                id: "mock-user-id",
                firstName: body.firstName || "John",
                lastName: "Doe",
                username: "johndoe",
                email: "john@test.com",
                role: "USER",
                status: "ACTIVE",
                avatarUrl: body.avatarUrl || null,
                createdAt: new Date().toISOString(),
              },
            };
          },
          {
            body: t.Object({
              firstName: t.Optional(t.String()),
              lastName: t.Optional(t.String()),
              username: t.Optional(t.String()),
              avatarUrl: t.Optional(t.String()),
            }),
          },
        ),
    );

  app.use(userGroup);

  return { app, usersStore };
}

describe("Users API — Role-based Access Control", () => {
  const { app } = createTestApp();

  describe("GET /api/v1/admin/users", () => {
    it("ADMIN can access user list", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users", {
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("EDITOR cannot access user list", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users", {
          headers: { Authorization: "Bearer editor-token" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("USER cannot access user list", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users", {
          headers: { Authorization: "Bearer user-token" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("user without token gets 401", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users"),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/admin/users/:id", () => {
    it("ADMIN can get user by ID", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/regular-user-id", {
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe("regular-user-id");
    });

    it("EDITOR cannot get user by ID", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/regular-user-id", {
          headers: { Authorization: "Bearer editor-token" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("USER cannot get user by ID", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/regular-user-id", {
          headers: { Authorization: "Bearer user-token" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("returns 404 for non-existent user", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/non-existent-id", {
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/admin/users/:id/role", () => {
    it("ADMIN can change user role", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/regular-user-id/role",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ role: "EDITOR" }),
          },
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.role).toBe("EDITOR");
    });

    it("EDITOR cannot change roles", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/regular-user-id/role",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer editor-token",
            },
            body: JSON.stringify({ role: "EDITOR" }),
          },
        ),
      );
      expect(res.status).toBe(403);
    });

    it("USER cannot change roles", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/regular-user-id/role",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer user-token",
            },
            body: JSON.stringify({ role: "EDITOR" }),
          },
        ),
      );
      expect(res.status).toBe(403);
    });

    it("rejects invalid role value", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/regular-user-id/role",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ role: "SUPER_ADMIN" }),
          },
        ),
      );
      expect(res.status).toBe(422);
    });

    it("rejects missing role field", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/regular-user-id/role",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({}),
          },
        ),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("PATCH /api/v1/admin/users/:id/status", () => {
    it("ADMIN can change user status", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/regular-user-id/status",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ status: "SUSPENDED" }),
          },
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("SUSPENDED");
    });

    it("EDITOR cannot change user status", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/regular-user-id/status",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer editor-token",
            },
            body: JSON.stringify({ status: "ACTIVE" }),
          },
        ),
      );
      expect(res.status).toBe(403);
    });

    it("USER cannot change user status", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/regular-user-id/status",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer user-token",
            },
            body: JSON.stringify({ status: "ACTIVE" }),
          },
        ),
      );
      expect(res.status).toBe(403);
    });

    it("rejects invalid status value", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/regular-user-id/status",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ status: "BANNED" }),
          },
        ),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("DELETE /api/v1/admin/users/:id", () => {
    it("ADMIN can delete user", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/regular-user-id", {
          method: "DELETE",
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeNull();
    });

    it("EDITOR cannot delete user", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/editor-user-id", {
          method: "DELETE",
          headers: { Authorization: "Bearer editor-token" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("USER cannot delete user", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/admin-user-id", {
          method: "DELETE",
          headers: { Authorization: "Bearer user-token" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("returns 404 for non-existent user", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/non-existent-id", {
          method: "DELETE",
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("ADMIN can access all routes", () => {
    it("ADMIN can list users", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users", {
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(200);
    });

    it("ADMIN can get user by ID", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/admin-user-id", {
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(200);
    });

    it("ADMIN can change roles", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/editor-user-id/role",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ role: "USER" }),
          },
        ),
      );
      expect(res.status).toBe(200);
    });

    it("ADMIN can change status", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/admin-user-id/status",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ status: "ACTIVE" }),
          },
        ),
      );
      expect(res.status).toBe(200);
    });

    it("ADMIN can delete users", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/editor-user-id", {
          method: "DELETE",
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(200);
    });
  });

  describe("Authentication enforcement", () => {
    it("returns 401 without token for admin list", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users"),
      );
      expect(res.status).toBe(401);
    });

    it("returns 401 without token for admin detail", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users/some-id"),
      );
      expect(res.status).toBe(401);
    });

    it("returns 401 without token for role change", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/users/some-id/role",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "USER" }),
          },
        ),
      );
      expect(res.status).toBe(401);
    });

    it("returns 401 with invalid token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users", {
          headers: { Authorization: "Bearer invalid-token" },
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 401 without Bearer prefix", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users", {
          headers: { Authorization: "Basic some-token" },
        }),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("Response format", () => {
    it("success response has correct shape", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users", {
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      const body = await res.json();
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("message");
      expect(body).toHaveProperty("data");
      expect(body.success).toBe(true);
    });

    it("error response has correct shape", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users", {
          headers: { Authorization: "Bearer user-token" },
        }),
      );
      const body = await res.json();
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("message");
      expect(body.success).toBe(false);
    });

    it("pagination is included on list endpoints", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/users", {
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      const body = await res.json();
      expect(body).toHaveProperty("pagination");
      expect(body.pagination).toHaveProperty("page");
      expect(body.pagination).toHaveProperty("limit");
      expect(body.pagination).toHaveProperty("total");
      expect(body.pagination).toHaveProperty("totalPages");
      expect(body.pagination).toHaveProperty("hasNextPage");
      expect(body.pagination).toHaveProperty("hasPreviousPage");
    });
  });
});
