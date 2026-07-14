import prisma from "../config/database";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "../utils/api-error";
import { slugify } from "../utils/slug";
import { auditService, AuditAction } from "./audit.service";

export class ComicTypeService {
  async getAll(isActiveOnly = false) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (isActiveOnly) {
      where.isActive = true;
    }

    return prisma.comicType.findMany({
      where: where as any,
      orderBy: { name: "asc" },
    });
  }

  async getBySlug(slug: string) {
    const comicType = await prisma.comicType.findUnique({
      where: { slug },
    });

    if (!comicType || comicType.deletedAt) {
      throw new NotFoundError("Tipo de cómic no encontrado");
    }

    return comicType;
  }

  async getById(id: string) {
    const comicType = await prisma.comicType.findUnique({
      where: { id },
    });

    if (!comicType || comicType.deletedAt) {
      throw new NotFoundError("Tipo de cómic no encontrado");
    }

    return comicType;
  }

  async create(
    data: { name: string; description?: string },
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const slug = slugify(data.name);

    const existing = await prisma.comicType.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictError("Ya existe un tipo de cómic con ese nombre");
    }

    const comicType = await prisma.comicType.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.COMIC_TYPE_CREATED,
      entity: "ComicType",
      entityId: comicType.id,
      metadata: { name: comicType.name },
      ipAddress,
      userAgent,
    });

    return comicType;
  }

  async update(
    id: string,
    data: { name?: string; description?: string },
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.getById(id);

    if (data.name) {
      const slug = slugify(data.name);
      const existing = await prisma.comicType.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictError("Ya existe un tipo de cómic con ese nombre");
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name) {
      updateData.name = data.name;
      updateData.slug = slugify(data.name);
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    const comicType = await prisma.comicType.update({
      where: { id },
      data: updateData,
    });

    await auditService.log({
      userId,
      action: AuditAction.COMIC_TYPE_UPDATED,
      entity: "ComicType",
      entityId: id,
      metadata: { name: comicType.name },
      ipAddress,
      userAgent,
    });

    return comicType;
  }

  async toggleStatus(id: string, isActive: boolean) {
    await this.getById(id);
    return prisma.comicType.update({
      where: { id },
      data: { isActive },
    });
  }

  async delete(id: string, userId: string) {
    await this.getById(id);

    const comicsCount = await prisma.comic.count({
      where: { comicTypeId: id, deletedAt: null },
    });

    if (comicsCount > 0) {
      await prisma.comicType.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
    } else {
      await prisma.comicType.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }
  }
}

export const comicTypeService = new ComicTypeService();
