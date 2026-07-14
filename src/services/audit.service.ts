import prisma from "../config/database";

export enum AuditAction {
  USER_REGISTERED = "USER_REGISTERED",
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",
  USER_STATUS_CHANGED = "USER_STATUS_CHANGED",
  USER_ROLE_CHANGED = "USER_ROLE_CHANGED",
  USER_DELETED = "USER_DELETED",
  COMIC_CREATED = "COMIC_CREATED",
  COMIC_UPDATED = "COMIC_UPDATED",
  COMIC_PUBLISHED = "COMIC_PUBLISHED",
  COMIC_ARCHIVED = "COMIC_ARCHIVED",
  COMIC_DELETED = "COMIC_DELETED",
  COMIC_TYPE_CREATED = "COMIC_TYPE_CREATED",
  COMIC_TYPE_UPDATED = "COMIC_TYPE_UPDATED",
}

export class AuditService {
  async log(params: {
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch {
      console.error("Error al registrar auditoría");
    }
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    action?: string;
    entity?: string;
    userId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (params.action) where.action = params.action;
    if (params.entity) where.entity = params.entity;
    if (params.userId) where.userId = params.userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: where as any,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where: where as any }),
    ]);

    return { logs, total };
  }
}

export const auditService = new AuditService();
