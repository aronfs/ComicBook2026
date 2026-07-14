import { describe, it, expect } from "bun:test";
import { Elysia, t } from "elysia";
import {
  ApiError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
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

  const comicsStore: Map<
    string,
    {
      id: string;
      title: string;
      slug: string;
      description?: string;
      author: string;
      publisher?: string;
      publicationYear: number;
      coverImageUrl?: string;
      comicTypeId: string;
      comicType?: { id: string; name: string; slug: string };
      status: string;
      availability: string;
      isFeatured: boolean;
      createdById: string;
      createdAt: string;
      updatedAt?: string;
      publishedAt?: string;
      deletedAt?: string | null;
    }
  > = new Map();

  let comicIdCounter = 0;

  // --- Public catalog routes ---

  app.group("/api/v1/comics", (g) =>
    g
      .get("/", ({ query }: { query: any }) => {
        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 20;
        const search = (query.search as string) || "";
        const type = (query.type as string) || "";

        let filtered = Array.from(comicsStore.values()).filter(
          (c) => c.status === "PUBLISHED" && !c.deletedAt,
        );

        if (search) {
          filtered = filtered.filter(
            (c) =>
              c.title.toLowerCase().includes(search.toLowerCase()) ||
              (c.description || "")
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              c.author.toLowerCase().includes(search.toLowerCase()),
          );
        }

        if (type) {
          filtered = filtered.filter(
            (c) => c.comicType?.slug === type,
          );
        }

        const total = filtered.length;
        const start = (page - 1) * limit;
        const comics = filtered.slice(start, start + limit);

        return {
          success: true,
          message: "Catálogo obtenido exitosamente",
          data: comics.map(({ deletedAt, ...rest }) => rest),
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
      .get("/featured", () => {
        const featured = Array.from(comicsStore.values())
          .filter((c) => c.status === "PUBLISHED" && c.isFeatured && !c.deletedAt)
          .slice(0, 10);

        return {
          success: true,
          message: "Cómics destacados obtenidos exitosamente",
          data: featured.map(({ deletedAt, ...rest }) => rest),
        };
      })
      .get("/:slug", ({ params }: { params: { slug: string } }) => {
        const comic = Array.from(comicsStore.values()).find(
          (c) => c.slug === params.slug,
        );
        if (!comic || comic.deletedAt || comic.status !== "PUBLISHED") {
          throw new NotFoundError("El cómic solicitado no existe");
        }
        const { deletedAt, ...rest } = comic;
        return {
          success: true,
          message: "Cómic obtenido exitosamente",
          data: rest,
        };
      }),
  );

  // --- Admin comic management ---

  const adminGroup = new Elysia()
    .use(authGuard)
    .group("/api/v1/admin/comics", (g) =>
      g
        .onBeforeHandle(({ user }: { user?: any }) => {
          if (!user) throw new ApiError(401, "No autorizado");
          if (user.role !== "EDITOR" && user.role !== "ADMIN") {
            throw new ForbiddenError(
              "No tienes permisos para realizar esta acción",
            );
          }
        })
        .post(
          "/",
          ({ body, user }: { body: any; user?: any }) => {
            const id = `comic-${++comicIdCounter}`;
            const slug = body.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") + `-${Math.random().toString(36).substring(2, 6)}`;

            const entry = {
              id,
              title: body.title,
              slug,
              description: body.description || null,
              author: body.author,
              publisher: body.publisher || null,
              publicationYear: body.publicationYear,
              coverImageUrl: body.coverImageUrl || null,
              comicTypeId: body.comicTypeId,
              comicType: { id: body.comicTypeId, name: "Mock Type", slug: "mock-type" },
              status: "DRAFT" as const,
              availability: body.availability || "AVAILABLE",
              isFeatured: false,
              createdById: user!.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              publishedAt: null as any,
              deletedAt: null,
            };
            comicsStore.set(id, entry);
            const { deletedAt, ...rest } = entry;
            return {
              success: true,
              message: "Cómic registrado exitosamente",
              data: rest,
            };
          },
          {
            body: t.Object({
              title: t.String(),
              author: t.String(),
              publicationYear: t.Number(),
              comicTypeId: t.String(),
              description: t.Optional(t.String()),
              publisher: t.Optional(t.String()),
              coverImageUrl: t.Optional(t.String()),
              availability: t.Optional(t.String()),
            }),
          },
        )
        .put(
          "/:id",
          ({ params, body }: { params: { id: string }; body: any }) => {
            const comic = comicsStore.get(params.id);
            if (!comic || comic.deletedAt) {
              throw new NotFoundError("Cómic no encontrado");
            }
            const updated = {
              ...comic,
              ...body,
              updatedAt: new Date().toISOString(),
            };
            if (body.title) {
              updated.slug =
                body.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "") +
                `-${Math.random().toString(36).substring(2, 6)}`;
            }
            comicsStore.set(params.id, updated);
            const { deletedAt, ...rest } = updated;
            return {
              success: true,
              message: "Cómic actualizado exitosamente",
              data: rest,
            };
          },
          {
            body: t.Object({
              title: t.Optional(t.String()),
              author: t.Optional(t.String()),
              publicationYear: t.Optional(t.Number()),
              comicTypeId: t.Optional(t.String()),
              description: t.Optional(t.String()),
              publisher: t.Optional(t.String()),
              availability: t.Optional(t.String()),
            }),
          },
        )
        .patch(
          "/:id/status",
          ({ params, body }: { params: { id: string }; body: any }) => {
            const comic = comicsStore.get(params.id);
            if (!comic || comic.deletedAt) {
              throw new NotFoundError("Cómic no encontrado");
            }
            const updated = {
              ...comic,
              status: body.status,
              updatedAt: new Date().toISOString(),
            };
            if (body.status === "PUBLISHED") {
              updated.publishedAt = new Date().toISOString();
            }
            comicsStore.set(params.id, updated);
            const { deletedAt, ...rest } = updated;
            return {
              success: true,
              message: "Estado del cómic actualizado exitosamente",
              data: rest,
            };
          },
          {
            body: t.Object({
              status: t.Enum({
                DRAFT: "DRAFT",
                PUBLISHED: "PUBLISHED",
                ARCHIVED: "ARCHIVED",
              }),
            }),
          },
        )
        .post("/:id/publish", ({ params }: { params: { id: string } }) => {
          const comic = comicsStore.get(params.id);
          if (!comic || comic.deletedAt) {
            throw new NotFoundError("Cómic no encontrado");
          }
          if (comic.status === "PUBLISHED") {
            throw new ApiError(400, "El cómic ya está publicado");
          }
          if (comic.status === "ARCHIVED") {
            throw new ApiError(
              400,
              "No se puede publicar un cómic archivado",
            );
          }
          const updated = {
            ...comic,
            status: "PUBLISHED" as const,
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          comicsStore.set(params.id, updated);
          const { deletedAt, ...rest } = updated;
          return {
            success: true,
            message: "Cómic publicado exitosamente",
            data: rest,
          };
        })
        .post("/:id/archive", ({ params }: { params: { id: string } }) => {
          const comic = comicsStore.get(params.id);
          if (!comic || comic.deletedAt) {
            throw new NotFoundError("Cómic no encontrado");
          }
          const updated = {
            ...comic,
            status: "ARCHIVED" as const,
            updatedAt: new Date().toISOString(),
          };
          comicsStore.set(params.id, updated);
          const { deletedAt, ...rest } = updated;
          return {
            success: true,
            message: "Cómic archivado exitosamente",
            data: rest,
          };
        }),
    );

  app.use(adminGroup);

  return { app, comicsStore, comicIdCounter };
}

describe("Comics API", () => {
  const { app } = createTestApp();

  function createComicAs(
    token: string,
    overrides: Record<string, unknown> = {},
  ) {
    return app.fetch(
      new Request("http://localhost/api/v1/admin/comics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "Test Comic",
          author: "Test Author",
          publicationYear: 2024,
          comicTypeId: "type-123",
          ...overrides,
        }),
      }),
    );
  }

  describe("POST /api/v1/admin/comics — creation", () => {
    it("should create a comic as ADMIN", async () => {
      const res = await createComicAs("admin-token", {
        title: "Admin's Comic",
        description: "Created by admin",
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("DRAFT");
      expect(body.data.title).toBe("Admin's Comic");
      expect(body.data).toHaveProperty("slug");
    });

    it("should create a comic as EDITOR", async () => {
      const res = await createComicAs("editor-token", {
        title: "Editor's Comic",
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe("Editor's Comic");
    });

    it("should reject creation as USER", async () => {
      const res = await createComicAs("user-token", {
        title: "User's Comic",
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe(
        "No tienes permisos para realizar esta acción",
      );
    });

    it("should reject creation without token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "No Token Comic",
            author: "Author",
            publicationYear: 2024,
            comicTypeId: "type-123",
          }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("should reject creation with missing required fields", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ title: "Incomplete" }),
        }),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("Initial status", () => {
    it("should create comic with DRAFT status", async () => {
      const res = await createComicAs("admin-token", {
        title: "Draft Test Comic",
      });
      const body = await res.json();
      expect(body.data.status).toBe("DRAFT");
    });
  });

  describe("PUT /api/v1/admin/comics/:id — edit", () => {
    it("should edit a comic", async () => {
      const createRes = await createComicAs("admin-token", {
        title: "Editable Comic",
      });
      const created = await createRes.json();
      const comicId = created.data.id;

      const res = await app.fetch(
        new Request(`http://localhost/api/v1/admin/comics/${comicId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({
            title: "Updated Comic Title",
            description: "Updated description",
          }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.title).toBe("Updated Comic Title");
      expect(body.data.description).toBe("Updated description");
    });

    it("should return 404 for non-existent comic", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/admin/comics/non-existent-id", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-token",
          },
          body: JSON.stringify({ title: "Ghost" }),
        }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/admin/comics/:id/publish", () => {
    it("should publish a comic", async () => {
      const createRes = await createComicAs("admin-token", {
        title: "Publishable Comic",
        description: "Has description",
      });
      const created = await createRes.json();
      const comicId = created.data.id;

      const res = await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comics/${comicId}/publish`,
          {
            method: "POST",
            headers: { Authorization: "Bearer admin-token" },
          },
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("PUBLISHED");
      expect(body.data).toHaveProperty("publishedAt");
    });

    it("should reject publishing already published comic", async () => {
      const createRes = await createComicAs("admin-token", {
        title: "Already Published",
        description: "Will be published twice",
      });
      const created = await createRes.json();
      const comicId = created.data.id;

      await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comics/${comicId}/publish`,
          {
            method: "POST",
            headers: { Authorization: "Bearer admin-token" },
          },
        ),
      );

      const res = await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comics/${comicId}/publish`,
          {
            method: "POST",
            headers: { Authorization: "Bearer admin-token" },
          },
        ),
      );
      expect(res.status).toBe(400);
    });

    it("should reject publishing archived comic", async () => {
      const createRes = await createComicAs("admin-token", {
        title: "Archived Comic",
        description: "Will be archived then published",
      });
      const created = await createRes.json();
      const comicId = created.data.id;

      await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comics/${comicId}/archive`,
          {
            method: "POST",
            headers: { Authorization: "Bearer admin-token" },
          },
        ),
      );

      const res = await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comics/${comicId}/publish`,
          {
            method: "POST",
            headers: { Authorization: "Bearer admin-token" },
          },
        ),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/admin/comics/:id/archive", () => {
    it("should archive a comic", async () => {
      const createRes = await createComicAs("admin-token", {
        title: "Archivable Comic",
      });
      const created = await createRes.json();
      const comicId = created.data.id;

      const res = await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comics/${comicId}/archive`,
          {
            method: "POST",
            headers: { Authorization: "Bearer admin-token" },
          },
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("ARCHIVED");
    });
  });

  describe("PATCH /api/v1/admin/comics/:id/status", () => {
    it("should change status via status endpoint", async () => {
      const createRes = await createComicAs("admin-token", {
        title: "Status Change Comic",
      });
      const created = await createRes.json();
      const comicId = created.data.id;

      const res = await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comics/${comicId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ status: "PUBLISHED" }),
          },
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("PUBLISHED");
    });

    it("should reject invalid status value", async () => {
      const createRes = await createComicAs("admin-token", {
        title: "Invalid Status Comic",
      });
      const created = await createRes.json();
      const comicId = created.data.id;

      const res = await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comics/${comicId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admin-token",
            },
            body: JSON.stringify({ status: "INVALID_STATUS" }),
          },
        ),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("GET /api/v1/comics — catalog", () => {
    it("should return paginated results", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/comics"),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body).toHaveProperty("pagination");
      expect(body.pagination).toHaveProperty("page");
      expect(body.pagination).toHaveProperty("limit");
      expect(body.pagination).toHaveProperty("total");
    });

    it("should search by title", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/comics?search=Admin",
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      body.data.forEach((c: any) => {
        const match =
          c.title.toLowerCase().includes("admin") ||
          (c.description || "").toLowerCase().includes("admin") ||
          c.author.toLowerCase().includes("admin");
        expect(match).toBe(true);
      });
    });

    it("should filter by type", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/api/v1/comics?type=mock-type",
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      body.data.forEach((c: any) => {
        expect(c.comicType.slug).toBe("mock-type");
      });
    });

    it("should paginate results", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/comics?page=1&limit=5"),
      );
      const body = await res.json();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(5);
      expect(body.data.length).toBeLessThanOrEqual(5);
    });

    it("should not include DRAFT comics in public catalog", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/comics"),
      );
      const body = await res.json();
      body.data.forEach((c: any) => {
        expect(c.status).not.toBe("DRAFT");
      });
    });
  });

  describe("GET /api/v1/comics/featured", () => {
    it("should return featured comics", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/comics/featured"),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/comics/:slug", () => {
    it("should get comic detail by slug", async () => {
      const createRes = await createComicAs("admin-token", {
        title: "Slug Test Comic",
        description: "For slug lookup",
      });
      const created = await createRes.json();
      const comicId = created.data.id;

      await app.fetch(
        new Request(
          `http://localhost/api/v1/admin/comics/${comicId}/publish`,
          {
            method: "POST",
            headers: { Authorization: "Bearer admin-token" },
          },
        ),
      );

      const slug = created.data.slug;
      const res = await app.fetch(
        new Request(`http://localhost/api/v1/comics/${slug}`),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.slug).toBe(slug);
      expect(body.data).toHaveProperty("title");
      expect(body.data).toHaveProperty("author");
    });

    it("should return 404 for non-existent slug", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/comics/non-existent-slug"),
      );
      expect(res.status).toBe(404);
    });

    it("should return 404 for draft comic slug", async () => {
      const createRes = await createComicAs("admin-token", {
        title: "Hidden Draft",
      });
      const created = await createRes.json();

      const res = await app.fetch(
        new Request(
          `http://localhost/api/v1/comics/${created.data.slug}`,
        ),
      );
      expect(res.status).toBe(404);
    });
  });
});
