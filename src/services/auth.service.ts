import prisma from "../config/database";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from "../utils/api-error";
import { tokenService } from "./token.service";
import { auditService, AuditAction } from "./audit.service";
import type {
  RegisterInput,
  LoginInput,
  LoginResponse,
  UserPublic,
} from "../types/auth.types";

export class AuthService {
  private userSelect = {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    email: true,
    role: true,
    status: true,
    avatarUrl: true,
    createdAt: true,
  };

  async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new ConflictError("El correo electrónico ya se encuentra registrado");
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existingUsername) {
      throw new ConflictError("El nombre de usuario ya se encuentra registrado");
    }

    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: "argon2id",
      memoryCost: 19456,
      timeCost: 2,
    });

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        email: input.email,
        passwordHash,
        role: "USER",
        status: "ACTIVE",
      },
      select: this.userSelect,
    });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: "",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const tokens = await tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    const refreshTokenHash = await tokenService.hashToken(tokens.refreshToken);
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    await auditService.log({
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      entity: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toUserPublic(user),
    };
  }

  async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    if (user.deletedAt) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    if (user.status === "SUSPENDED") {
      throw new ForbiddenError(
        "Tu cuenta ha sido suspendida. Contacta al administrador."
      );
    }

    if (user.status === "INACTIVE") {
      throw new ForbiddenError(
        "Tu cuenta está inactiva. Contacta al administrador."
      );
    }

    const validPassword = await Bun.password.verify(
      input.password,
      user.passwordHash
    );
    if (!validPassword) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: "",
        expiresAt: tokenService.parseExpiresIn(),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    const tokens = await tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    const refreshTokenHash = await tokenService.hashToken(tokens.refreshToken);
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    await auditService.log({
      userId: user.id,
      action: AuditAction.USER_LOGIN,
      entity: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toUserPublic(user),
    };
  }

  async refresh(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    let payload;
    try {
      payload = await tokenService.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedError("Refresh token inválido o expirado");
    }

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError("Sesión no encontrada");
    }

    if (session.revokedAt) {
      await prisma.session.updateMany({
        where: { userId: session.userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError("Sesión revocada");
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedError("Sesión expirada");
    }

    const validHash = await tokenService.verifyTokenHash(
      refreshToken,
      session.refreshTokenHash
    );
    if (!validHash) {
      throw new UnauthorizedError("Refresh token inválido");
    }

    if (session.user.status === "SUSPENDED") {
      throw new ForbiddenError("Cuenta suspendida");
    }

    if (session.user.deletedAt) {
      throw new UnauthorizedError("Cuenta no encontrada");
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const newSession = await prisma.session.create({
      data: {
        userId: session.userId,
        refreshTokenHash: "",
        expiresAt: tokenService.parseExpiresIn(),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    const tokens = await tokenService.generateTokens({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: newSession.id,
    });

    const newHash = await tokenService.hashToken(tokens.refreshToken);
    await prisma.session.update({
      where: { id: newSession.id },
      data: { refreshTokenHash: newHash },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toUserPublic(session.user),
    };
  }

  async logout(sessionId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await auditService.log({
      userId,
      action: AuditAction.USER_LOGOUT,
      entity: "Session",
      entityId: sessionId,
      ipAddress,
      userAgent,
    });
  }

  async logoutAll(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const sessions = await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await auditService.log({
      userId,
      action: AuditAction.USER_LOGOUT,
      entity: "User",
      entityId: userId,
      metadata: { sessionsRevoked: sessions.count },
      ipAddress,
      userAgent,
    });
  }

  async getMe(userId: string): Promise<UserPublic> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect,
    });

    if (!user || (await this.isDeleted(userId))) {
      throw new NotFoundError("Usuario no encontrado");
    }

    return this.toUserPublic(user);
  }

  private async isDeleted(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });
    return user?.deletedAt !== null;
  }

  private toUserPublic(user: Record<string, unknown>): UserPublic {
    return {
      id: user.id as string,
      firstName: user.firstName as string,
      lastName: user.lastName as string,
      username: user.username as string,
      email: user.email as string,
      role: user.role as string,
      status: user.status as string,
      avatarUrl: (user.avatarUrl as string) || null,
      createdAt: (user.createdAt as Date).toISOString(),
    };
  }
}

export const authService = new AuthService();
