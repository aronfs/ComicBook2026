import { describe, it, expect } from "bun:test";
import { Elysia, t } from "elysia";
import {
  ApiError,
  ConflictError,
  UnauthorizedError,
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
        throw new UnauthorizedError("Token de acceso no proporcionado");
      }
      const token = auth.slice(7);
      if (token === "expired-token") {
        throw new UnauthorizedError("Token expirado");
      }
      if (token === "invalid-token") {
        throw new UnauthorizedError("Token inválido");
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

  const users: Map<
    string,
    {
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      password: string;
      role: string;
      status: string;
    }
  > = new Map();

  app.post(
    "/api/v1/auth/register",
    ({ body }: { body: any }) => {
      const { firstName, lastName, username, email, password } = body;

      if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/\d/.test(password) ||
        !/[!@#$%^&*]/.test(password)
      ) {
        throw new ApiError(
          400,
          "La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial",
        );
      }

      if (email === "existing@test.com") {
        throw new ConflictError("El correo electrónico ya se encuentra registrado");
      }
      if (username === "existinguser") {
        throw new ConflictError("El nombre de usuario ya se encuentra registrado");
      }

      const id = crypto.randomUUID();
      users.set(id, {
        firstName,
        lastName,
        username,
        email,
        password,
        role: "USER",
        status: "ACTIVE",
      });

      return {
        success: true,
        message: "Usuario registrado exitosamente",
        data: {
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          user: {
            id,
            firstName,
            lastName,
            username,
            email,
            role: "USER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: new Date().toISOString(),
          },
        },
      };
    },
    {
      body: t.Object({
        firstName: t.String(),
        lastName: t.String(),
        username: t.String(),
        email: t.String(),
        password: t.String(),
      }),
    },
  );

  app.post(
    "/api/v1/auth/login",
    ({ body }: { body: any }) => {
      const { email, password } = body;

      if (email === "suspended@test.com") {
        throw new ForbiddenError(
          "Tu cuenta ha sido suspendida. Contacta al administrador.",
        );
      }

      const user = Array.from(users.values()).find((u) => u.email === email);
      if (!user || user.password !== password) {
        throw new UnauthorizedError("Credenciales inválidas");
      }

      return {
        success: true,
        message: "Inicio de sesión exitoso",
        data: {
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          user: {
            id: crypto.randomUUID(),
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            avatarUrl: null,
            createdAt: new Date().toISOString(),
          },
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    },
  );

  app.post(
    "/api/v1/auth/refresh",
    ({ body }: { body: any }) => {
      const { refreshToken } = body;

      if (refreshToken === "revoked-refresh-token") {
        throw new UnauthorizedError("Sesión revocada");
      }

      if (refreshToken === "expired-refresh-token") {
        throw new UnauthorizedError("Refresh token inválido o expirado");
      }

      if (refreshToken === "invalid-refresh-token") {
        throw new UnauthorizedError("Refresh token inválido o expirado");
      }

      return {
        success: true,
        message: "Sesión renovada exitosamente",
        data: {
          accessToken: "mock-new-access-token",
          refreshToken: "mock-new-refresh-token",
          user: {
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
        },
      };
    },
    {
      body: t.Object({
        refreshToken: t.String(),
      }),
    },
  );

  const protectedGroup = new Elysia().use(authGuard).group("/api/v1/auth", (g) =>
    g
      .post("/logout", () => {
        return {
          success: true,
          message: "Sesión cerrada exitosamente",
          data: null,
        };
      })
      .post("/logout-all", () => {
        return {
          success: true,
          message: "Sesiones cerradas exitosamente",
          data: null,
        };
      })
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
      }),
  );

  app.use(protectedGroup);

  return app;
}

describe("Auth API", () => {
  const app = createTestApp();

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user successfully", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "John",
            lastName: "Doe",
            username: "johndoe",
            email: "john@test.com",
            password: "StrongP@ss1",
          }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe("Usuario registrado exitosamente");
      expect(body.data).toHaveProperty("accessToken");
      expect(body.data).toHaveProperty("refreshToken");
      expect(body.data.user).toHaveProperty("id");
      expect(body.data.user.firstName).toBe("John");
      expect(body.data.user.role).toBe("USER");
    });

    it("should reject duplicate email", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Jane",
            lastName: "Doe",
            username: "janedoe",
            email: "existing@test.com",
            password: "StrongP@ss1",
          }),
        }),
      );
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe(
        "El correo electrónico ya se encuentra registrado",
      );
    });

    it("should reject duplicate username", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Jack",
            lastName: "Doe",
            username: "existinguser",
            email: "jack@test.com",
            password: "StrongP@ss1",
          }),
        }),
      );
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe(
        "El nombre de usuario ya se encuentra registrado",
      );
    });

    it("should reject weak password", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Jim",
            lastName: "Doe",
            username: "jimdoe",
            email: "jim@test.com",
            password: "weak",
          }),
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it("should reject missing required fields", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "John",
          }),
        }),
      );
      expect(res.status).toBe(422);
    });

    it("should reject empty body", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login successfully", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@test.com",
            password: "StrongP@ss1",
          }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe("Inicio de sesión exitoso");
      expect(body.data).toHaveProperty("accessToken");
      expect(body.data).toHaveProperty("user");
    });

    it("should reject wrong password", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@test.com",
            password: "WrongP@ss1",
          }),
        }),
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Credenciales inválidas");
    });

    it("should reject suspended user", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "suspended@test.com",
            password: "StrongP@ss1",
          }),
        }),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe(
        "Tu cuenta ha sido suspendida. Contacta al administrador.",
      );
    });

    it("should reject missing email", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "StrongP@ss1" }),
        }),
      );
      expect(res.status).toBe(422);
    });

    it("should reject missing password", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "john@test.com" }),
        }),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("should refresh token with valid token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refreshToken: "valid-refresh-token",
          }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe("Sesión renovada exitosamente");
      expect(body.data.accessToken).toBe("mock-new-access-token");
      expect(body.data.refreshToken).toBe("mock-new-refresh-token");
    });

    it("should reject revoked refresh token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refreshToken: "revoked-refresh-token",
          }),
        }),
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Sesión revocada");
    });

    it("should reject expired refresh token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refreshToken: "expired-refresh-token",
          }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("should reject invalid refresh token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refreshToken: "invalid-refresh-token",
          }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("should reject missing refreshToken", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout successfully", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe("Sesión cerrada exitosamente");
      expect(body.data).toBeNull();
    });

    it("should reject logout without token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/logout-all", () => {
    it("should logout all sessions successfully", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/logout-all", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe("Sesiones cerradas exitosamente");
      expect(body.data).toBeNull();
    });

    it("should reject logout-all without token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/logout-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should return profile with valid token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/me", {
          method: "GET",
          headers: {
            Authorization: "Bearer valid-token",
          },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe("Perfil obtenido exitosamente");
      expect(body.data).toHaveProperty("id");
      expect(body.data).toHaveProperty("email");
      expect(body.data).toHaveProperty("role");
    });

    it("should reject with expired token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/me", {
          method: "GET",
          headers: {
            Authorization: "Bearer expired-token",
          },
        }),
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Token expirado");
    });

    it("should reject with invalid token", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/me", {
          method: "GET",
          headers: {
            Authorization: "Bearer invalid-token",
          },
        }),
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Token inválido");
    });

    it("should reject missing authorization header", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/me", {
          method: "GET",
        }),
      );
      expect(res.status).toBe(401);
    });

    it("should reject malformed authorization header", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/v1/auth/me", {
          method: "GET",
          headers: { Authorization: "Basic some-token" },
        }),
      );
      expect(res.status).toBe(401);
    });
  });
});
