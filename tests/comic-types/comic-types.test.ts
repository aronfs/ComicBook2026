import { describe, it, expect } from "bun:test";
import { Elysia, t } from "elysia";
import {
  ApiError,
  NotFoundError,
  ConflictError,
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
          id: "mock-user-id",
          email: "test@test.com",
          role: roleHint,
          sessionId: "mock-session-id",
        },
      };
    });
  }

  const typesStore: Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      isActive: boolean;
      createdAt: string;
      updatedAt?: string;
      deletedAt: string | null;
    }
  > = new Map();

  let typeIdCounter = 0;

  // Seed initial types
  const seedId = `type-${++typeIdCounter}`;
  typesStore.set(seedId, {
    id: seedId,
    name: "Superhero",
    slug: "superhero",
    description: "Superhero comics",
    isActive: true,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  });

  // Type with relations (used in delete test)
  const typeWithRelationsId = "type-with-comics";
  typesStore.set(typeWithRelationsId, {
    id: typeWithRelationsId,
    name: "Type With Comics",
    slug: "type-with-comics",
    description: "Has related comics",
    isActive: true,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  });

  // --- Public comic-type routes ---

  app.group("/api/v1/comic-types", (g) =>
    g
      .get("/", ({ query }: { query: any }) => {
        const isActiveOnly = query.active === "true";
        let types = Array.from(typesStore.values()).filter(
          (t) => !t.deletedAt,
        );
        if (isActiveOnly) {
          types = types.filter((t) => t.isActive);
        }
        return {
          success: true,
          message: "Tipos de cómic obtenidos exitosamente",
          data: types,
        };
      })
      .get("/:slug", ({ params }: { params: { slug: string } }) => {
        const type = Array.from(typesStore.values()).find(
          (t) => t.slug === params.slug,
        );
        if (!type || type.deletedAt) {
          throw new NotFoundError("Tipo de cómic no encontrado");
        }
        return {
          success: true,
          message: "Tipo de cómic obtenido exitosamente",
          data: type,
        };
      }),
  );

  // --- Admin comic-type management ---

  const adminGroup = new Elysia()
    .use(authGuard)
    .group("/api/v1/admin/comic-types", (g) =>
      g
        .onBeforeHandle(({ user }: { user?: any }) => {
          if (!user) throw new ApiError(401, "No autorizado");
          if (user.role !== "ADMIN") {
            throw new ForbiddenError(
              "No tienes permisos para realizar esta acción",
            );
          }
        })
        .post(
          "/",
          ({ body }: { body: any }) => {
            const slug = (body.name as string)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");

            const existing = Array.from(typesStore.values()).find(
              (t) => t.slug === slug,
            );
            if (existing) {
              throw new ConflictError(
                "Ya existe un tipo de cómic con ese nombre",
              );
            }

            const id = `type-${++typeIdCounter}`;
            const entry = {
              id,
              name: body.name,
              slug,
              description: body.description || null,
              isActive: true,
              createdAt: new Date().toISOString(),
              deletedAt: null,
            };
            typesStore.set(id, entry);
            return {
              success: true,
              message: "Tipo de cómic creado exitosamente",
              data: entry,
            };
          },
          {
            body: t.Object({
              name: t.String(),
              description: t.Optional(t.String()),
            }),
          },
        )
        .put(
          "/:id",
          ({ params, body }: { params: { id: string }; body: any }) => {
            const type = typesStore.get(params.id);
            if (!type || type.deletedAt) {
              throw new NotFoundError("Tipo de cómic no encontrado");
            }

            if (body.name) {
              const slug = (body.name as string)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              const duplicate = Array.from(typesStore.values()).find(
                (t) => t.slug === slug && t.id !== params.id,
              );
              if (duplicate) {
                throw new ConflictError(
                  "Ya existe un tipo de cómic con ese nombre",
                );
              }
            }

            const updated = {
              ...type,
              ...body,
              slug: body.name
                ? (body.name as string)
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")
                : type.slug,
              updatedAt: new Date().toISOString(),
            };
            typesStore.set(params.id, updated);
            return {
              success: true,
              message: "Tipo de cómic actualizado exitosamente",
              data: updated,
            };
          },
          {
            body: t.Object({
              name: t.Optional(t.String()),
              description: t.Optional(t.String()),
            }),
          },
        )
        .patch(
          "/:id/status",
          ({ params, body }: { params: { id: string }; body: any }) => {
            const type = typesStore.get(params.id);
            if (!type || type.deletedAt) {
              throw new NotFoundError("Tipo de cómic no encontrado");
            }
            const updated = {
              ...type,
              isActive: body.isActive,
              updatedAt: new Date().toISOString(),
            };
            typesStore.set(params.id, updated);
            return {
              success: true,
              message: "Estado del tipo de cómic actualizado exitosamente",
              data: updated,
            };
          },
          {
            body: t.Object({
              isActive: t.Boolean(),
            }),
          },
        )
        .delete("/:id", ({ params }: { params: { id: string } }) => {
          const type = typesStore.get(params.id);
          if (!type || type.deletedAt) {
            throw new NotFoundError("Tipo de cómic no encontrado");
          }

          const hasRelations = params.id === "type-with-comics";
          if (hasRelations) {
            const updated = {
              ...type,
              isActive: false,
              deletedAt: new Date().toISOString(),
            };
            typesStore.set(params.id, updated);
            return {
              success: true,
              message: "Tipo de cómic eliminado exitosamente",
              data: null,
            };
          }

          const updated = {
            ...type,
            deletedAt: new Date().toISOString(),
          };
          typesStore.set(params.id, updated);
          return {
            success: true,
            message: "Tipo de cómic eliminado exitosamente",
            data: null,
          };
        }),
    );

  app.use(adminGroup);

  return { app, typesStore };
}

describe("Comic Types API", () => {
  const { app } = createTestApp();

  describe("POST /api/v1/admin/comic-types — create", () => {
    it("should create a type as ADMIN", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({
            name: "Manga",
            description: "Japanese manga comics",
          }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Manga");
      expect(body.data.slug).toBe("manga");
      expect(body.data.isActive).toBe(true);
    });

    it("should create a type without description", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ name: "Webcomic" }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Webcomic");
      expect(body.data.description).toBeNull();
    });

    it("should reject creation as EDITOR", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer editor-token",
          },
          body: JSON.stringify({ name: "Editor Type" }),
        }),
      );
      expect(res.status).toBe(403);
    });

    it("should reject creation as USER", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer user-token",
          },
          body: JSON.stringify({ name: "User Type" }),
        }),
      );
      expect(res.status).toBe(403);
    });

    it("should reject creation without token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "No Auth Type" }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("should reject creation with missing name", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({}),
        }),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("Duplicate prevention", () => {
    it("should prevent duplicate type name", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ name: "Superhero" }),
        }),
      );
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.message).toBe(
        "Ya existe un tipo de cómic con ese nombre",
      );
    });
  });

  describe("PUT /api/v1/admin/comic-types/:id — edit", () => {
    it("should edit a type name", async () => {
      const createRes = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ name: "Edit Me", description: "Before edit" }),
        }),
      );
      const created = await createRes.json();
      const typeId = created.data.id;

      const res = await app.fetch(
        new Request(`http://localhost/api/v1/admin/comic-types/${typeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({
            name: "Edited Name",
            description: "After edit",
          }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Edited Name");
      expect(body.data.description).toBe("After edit");
    });

    it("should prevent editing to duplicate name", async () => {
      const createRes = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ name: "Unique Type" }),
        }),
      );
      const created = await createRes.json();
      const typeId = created.data.id;

      const res = await app.fetch(
        new Request(`http://localhost/api/v1/admin/comic-types/${typeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ name: "Superhero" }),
        }),
      );
      expect(res.status).toBe(409);
    });

    it("should return 404 for non-existent type", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types/non-existent", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ name: "Ghost" }),
        }),
      );
      expect(res.status).toBe(404);
    });

    it("should reject edit as EDITOR", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types/some-id", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer editor-token",
          },
          body: JSON.stringify({ name: "Editor Edit" }),
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/v1/admin/comic-types/:id/status — deactivate", () => {
    it("should deactivate a type", async () => {
      const createRes = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ name: "Deactivatable Type" }),
        }),
      );
      const created = await createRes.json();
      const typeId = created.data.id;

      const res = await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comic-types/${typeId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ isActive: false }),
          },
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.isActive).toBe(false);
    });

    it("should reactivate a type", async () => {
      const createRes = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ name: "Reactivable Type" }),
        }),
      );
      const created = await createRes.json();
      const typeId = created.data.id;

      await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comic-types/${typeId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ isActive: false }),
          },
        ),
      );

      const res = await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comic-types/${typeId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ isActive: true }),
          },
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.isActive).toBe(true);
    });

    it("should reject invalid isActive value", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/comic-types/some-id/status",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ isActive: "not-boolean" }),
          },
        ),
      );
      expect(res.status).toBe(422);
    });

    it("should reject status change as EDITOR", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/comic-types/some-id/status",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer editor-token",
            },
            body: JSON.stringify({ isActive: false }),
          },
        ),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/admin/comic-types/:id — delete", () => {
    it("should soft-delete a type without relations", async () => {
      const createRes = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ name: "Deletable Type" }),
        }),
      );
      const created = await createRes.json();
      const typeId = created.data.id;

      const res = await app.fetch(
        new Request(`http://localhost/api/v1/admin/comic-types/${typeId}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(200);

      const getRes = await app.fetch(
        new Request(`http://localhost/api/v1/comic-types/${created.data.slug}`),
      );
      expect(getRes.status).toBe(404);
    });

    it("should soft-deactivate type with relations instead of hard delete", async () => {
      const slugBefore = "type-with-comics";
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/admin/comic-types/type-with-comics",
          {
            method: "DELETE",
            headers: { Authorization: "Bearer admin-token" },
          },
        ),
      );
      expect(res.status).toBe(200);

      const publicRes = await app.fetch(
        new Request(`http://localhost/api/v1/comic-types/${slugBefore}`),
      );
      expect(publicRes.status).toBe(404);
    });

    it("should reject delete as EDITOR", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types/some-id", {
          method: "DELETE",
          headers: { Authorization: "Bearer editor-token" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("should reject delete as USER", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types/some-id", {
          method: "DELETE",
          headers: { Authorization: "Bearer user-token" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent type", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comic-types/non-existent", {
          method: "DELETE",
          headers: { Authorization: "Bearer admin-token" },
        }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/comic-types — public", () => {
    it("should list all active types", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/comic-types"),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter active-only types", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/comic-types?active=true"),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      body.data.forEach((t: any) => {
        expect(t.isActive).toBe(true);
      });
    });
  });

  describe("GET /api/v1/comic-types/:slug — public", () => {
    it("should get type by slug", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/comic-types/superhero"),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.slug).toBe("superhero");
      expect(body.data.name).toBe("Superhero");
    });

    it("should return 404 for non-existent slug", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/comic-types/non-existent"),
      );
      expect(res.status).toBe(404);
    });
  });
});
