import { authService } from "../services/auth.service";
import { apiSuccess } from "../utils/api-response";
import type { AuthUser } from "../types/context.types";

export class AuthController {
  async register({ body, request }: { body: any; request: Request }) {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const ua = request.headers.get("user-agent") || undefined;
    const result = await authService.register(body, ip, ua);
    return apiSuccess("Usuario registrado exitosamente", result);
  }

  async login({ body, request }: { body: any; request: Request }) {
    const ip = request.headers.get("x-forwarded-for") || undefined;
    const ua = request.headers.get("user-agent") || undefined;
    const result = await authService.login(body, ip, ua);
    return apiSuccess("Inicio de sesión exitoso", result);
  }

  async refresh({ body, request }: { body: any; request: Request }) {
    const ip = request.headers.get("x-forwarded-for") || undefined;
    const ua = request.headers.get("user-agent") || undefined;
    const result = await authService.refresh(body.refreshToken, ip, ua);
    return apiSuccess("Sesión renovada exitosamente", result);
  }

  async logout({ user, request }: { user: AuthUser; request: Request }) {
    const ip = request.headers.get("x-forwarded-for") || undefined;
    const ua = request.headers.get("user-agent") || undefined;
    await authService.logout(user.sessionId, user.id, ip, ua);
    return apiSuccess("Sesión cerrada exitosamente", null);
  }

  async logoutAll({ user, request }: { user: AuthUser; request: Request }) {
    const ip = request.headers.get("x-forwarded-for") || undefined;
    const ua = request.headers.get("user-agent") || undefined;
    await authService.logoutAll(user.id, ip, ua);
    return apiSuccess("Sesiones cerradas exitosamente", null);
  }

  async me({ user }: { user: AuthUser }) {
    const profile = await authService.getMe(user.id);
    return apiSuccess("Perfil obtenido exitosamente", profile);
  }

  async health() {
    return apiSuccess("Servicio disponible", {
      status: "healthy",
      environment: process.env.NODE_ENV || "development",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  }
}

export const authController = new AuthController();
