import prisma from "../config/database";
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from "../utils/api-error";
import type { UserPublic } from "../types/auth.types";

export class UserService {
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
    lastLoginAt: true,
  };

  async getProfile(userId: string): Promise<UserPublic> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect,
    });

    if (!user || user.status === "SUSPENDED") {
      throw new NotFoundError("Usuario no encontrado");
    }

    return this.toUserPublic(user);
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      username?: string;
      avatarUrl?: string;
    }
  ): Promise<UserPublic> {
    if (data.username) {
      const existing = await prisma.user.findUnique({
        where: { username: data.username },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictError("El nombre de usuario ya está en uso");
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: this.userSelect,
    });

    return this.toUserPublic(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    const valid = await Bun.password.verify(
      currentPassword,
      user.passwordHash
    );
    if (!valid) {
      throw new ForbiddenError("La contraseña actual no es correcta");
    }

    const passwordHash = await Bun.password.hash(newPassword, {
      algorithm: "argon2id",
      memoryCost: 19456,
      timeCost: 2,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getUsers(params: {
    page: number;
    limit: number;
    skip: number;
    search?: string;
    role?: string;
    status?: string;
    sort?: string;
    order?: string;
  }) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { username: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.role) {
      where.role = params.role;
    }

    if (params.status) {
      where.status = params.status;
    }

    const orderField = params.sort || "createdAt";
    const orderDir = params.order === "asc" ? "asc" : "desc";

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        select: this.userSelect,
        skip: params.skip,
        take: params.limit,
        orderBy: { [orderField]: orderDir },
      }),
      prisma.user.count({ where: where as any }),
    ]);

    return {
      users: users.map((u) => this.toUserPublic(u)),
      total,
    };
  }

  async getUserById(userId: string): Promise<UserPublic> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect,
    });

    if (!user || (await this.isDeleted(userId))) {
      throw new NotFoundError("Usuario no encontrado");
    }

    return this.toUserPublic(user);
  }

  async updateUserRole(userId: string, role: string): Promise<UserPublic> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: this.userSelect,
    });

    return this.toUserPublic(updated);
  }

  async updateUserStatus(
    userId: string,
    status: string
  ): Promise<UserPublic> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: status as any },
      select: this.userSelect,
    });

    if (status === "SUSPENDED") {
      await prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return this.toUserPublic(updated);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
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

export const userService = new UserService();
