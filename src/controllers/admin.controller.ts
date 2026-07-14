import { userService } from "../services/user.service";
import { comicService } from "../services/comic.service";
import { comicTypeService } from "../services/comic-type.service";
import { auditService, AuditAction } from "../services/audit.service";
import {
  apiSuccess,
  paginationInfo,
} from "../utils/api-response";
import type { AuthUser } from "../types/context.types";

export class AdminController {
  // Users
  async getUsers({ query }: { query: any }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { users, total } = await userService.getUsers({
      page,
      limit,
      skip,
      search: query.search,
      role: query.role,
      status: query.status,
      sort: query.sort,
      order: query.order,
    });

    return apiSuccess("Usuarios obtenidos exitosamente", users, {
      ...paginationInfo(page, limit, total),
    });
  }

  async getUserById({ params }: { params: { id: string } }) {
    const user = await userService.getUserById(params.id);
    return apiSuccess("Usuario obtenido exitosamente", user);
  }

  async updateUserRole({
    params,
    body,
    user,
    request,
  }: {
    params: { id: string };
    body: { role: string };
    user: AuthUser;
    request: Request;
  }) {
    const updated = await userService.updateUserRole(params.id, body.role);
    await auditService.log({
      userId: user.id,
      action: AuditAction.USER_ROLE_CHANGED,
      entity: "User",
      entityId: params.id,
      metadata: { newRole: body.role },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });
    return apiSuccess("Rol de usuario actualizado exitosamente", updated);
  }

  async updateUserStatus({
    params,
    body,
    user,
    request,
  }: {
    params: { id: string };
    body: { status: string };
    user: AuthUser;
    request: Request;
  }) {
    const updated = await userService.updateUserStatus(params.id, body.status);
    await auditService.log({
      userId: user.id,
      action: AuditAction.USER_STATUS_CHANGED,
      entity: "User",
      entityId: params.id,
      metadata: { newStatus: body.status },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });
    return apiSuccess(
      "Estado de usuario actualizado exitosamente",
      updated
    );
  }

  async deleteUser({
    params,
    user,
    request,
  }: {
    params: { id: string };
    user: AuthUser;
    request: Request;
  }) {
    await userService.deleteUser(params.id);
    await auditService.log({
      userId: user.id,
      action: AuditAction.USER_DELETED,
      entity: "User",
      entityId: params.id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });
    return apiSuccess("Usuario eliminado exitosamente", null);
  }

  // Comics
  async createComic({
    body,
    user,
    request,
  }: {
    body: any;
    user: AuthUser;
    request: Request;
  }) {
    const comic = await comicService.create(
      body,
      user.id,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );
    return apiSuccess("Cómic registrado exitosamente", comic);
  }

  async getComics({ query }: { query: any }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { comics, total } = await comicService.getAdminComics({
      page,
      limit,
      skip,
      search: query.search,
      status: query.status,
      type: query.type,
      availability: query.availability,
      sort: query.sort,
      order: query.order,
    });

    return apiSuccess("Cómics obtenidos exitosamente", comics, {
      ...paginationInfo(page, limit, total),
    });
  }

  async getComicById({ params }: { params: { id: string } }) {
    const comic = await comicService.getById(params.id, true);
    return apiSuccess("Cómic obtenido exitosamente", comic);
  }

  async updateComic({
    params,
    body,
    user,
    request,
  }: {
    params: { id: string };
    body: any;
    user: AuthUser;
    request: Request;
  }) {
    const comic = await comicService.update(
      params.id,
      body,
      user.id,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );
    return apiSuccess("Cómic actualizado exitosamente", comic);
  }

  async updateComicStatus({
    params,
    body,
    user,
    request,
  }: {
    params: { id: string };
    body: { status: string };
    user: AuthUser;
    request: Request;
  }) {
    const comic = await comicService.changeStatus(
      params.id,
      body.status,
      user.id,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );
    return apiSuccess("Estado del cómic actualizado exitosamente", comic);
  }

  async updateComicAvailability({
    params,
    body,
  }: {
    params: { id: string };
    body: { availability: string };
  }) {
    const comic = await comicService.changeAvailability(
      params.id,
      body.availability
    );
    return apiSuccess(
      "Disponibilidad del cómic actualizada exitosamente",
      comic
    );
  }

  async updateComicFeatured({
    params,
    body,
  }: {
    params: { id: string };
    body: { isFeatured: boolean };
  }) {
    const comic = await comicService.toggleFeatured(
      params.id,
      body.isFeatured
    );
    return apiSuccess(
      "Estado destacado del cómic actualizado exitosamente",
      comic
    );
  }

  async publishComic({
    params,
    user,
    request,
  }: {
    params: { id: string };
    user: AuthUser;
    request: Request;
  }) {
    const comic = await comicService.publish(
      params.id,
      user.id,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );
    return apiSuccess("Cómic publicado exitosamente", comic);
  }

  async archiveComic({
    params,
    user,
    request,
  }: {
    params: { id: string };
    user: AuthUser;
    request: Request;
  }) {
    const comic = await comicService.archive(
      params.id,
      user.id,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );
    return apiSuccess("Cómic archivado exitosamente", comic);
  }

  async deleteComic({
    params,
    user,
    request,
  }: {
    params: { id: string };
    user: AuthUser;
    request: Request;
  }) {
    await comicService.softDelete(
      params.id,
      user.id,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );
    return apiSuccess("Cómic eliminado exitosamente", null);
  }

  // Comic Types
  async createComicType({
    body,
    user,
    request,
  }: {
    body: any;
    user: AuthUser;
    request: Request;
  }) {
    const type = await comicTypeService.create(
      body,
      user.id,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );
    return apiSuccess("Tipo de cómic creado exitosamente", type);
  }

  async updateComicType({
    params,
    body,
    user,
    request,
  }: {
    params: { id: string };
    body: any;
    user: AuthUser;
    request: Request;
  }) {
    const type = await comicTypeService.update(
      params.id,
      body,
      user.id,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );
    return apiSuccess("Tipo de cómic actualizado exitosamente", type);
  }

  async toggleComicTypeStatus({
    params,
    body,
  }: {
    params: { id: string };
    body: { isActive: boolean };
  }) {
    const type = await comicTypeService.toggleStatus(
      params.id,
      body.isActive
    );
    return apiSuccess(
      "Estado del tipo de cómic actualizado exitosamente",
      type
    );
  }

  async deleteComicType({
    params,
    user,
    request,
  }: {
    params: { id: string };
    user: AuthUser;
    request: Request;
  }) {
    await comicTypeService.delete(
      params.id,
      user.id
    );
    return apiSuccess("Tipo de cómic eliminado exitosamente", null);
  }

  // Audit
  async getAuditLogs({ query }: { query: any }) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    const { logs, total } = await auditService.findMany({
      skip,
      take: limit,
      action: query.action,
      entity: query.entity,
      userId: query.userId,
    });

    return apiSuccess("Logs de auditoría obtenidos exitosamente", logs, {
      ...paginationInfo(page, limit, total),
    });
  }
}

export const adminController = new AdminController();
