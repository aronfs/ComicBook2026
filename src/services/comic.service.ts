import prisma from "../config/database";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "../utils/api-error";
import { generateUniqueSlug } from "../utils/slug";
import { auditService, AuditAction } from "./audit.service";

export class ComicService {
  private comicListSelect = {
    id: true,
    title: true,
    slug: true,
    description: true,
    author: true,
    publisher: true,
    publicationYear: true,
    coverImageUrl: true,
    status: true,
    availability: true,
    isFeatured: true,
    comicTypeId: true,
    comicType: { select: { id: true, name: true, slug: true } },
    createdAt: true,
    publishedAt: true,
  };

  private comicDetailSelect = {
    id: true,
    title: true,
    slug: true,
    originalTitle: true,
    description: true,
    synopsis: true,
    author: true,
    illustrator: true,
    publisher: true,
    publicationYear: true,
    issueNumber: true,
    totalPages: true,
    language: true,
    isbn: true,
    coverImageUrl: true,
    comicTypeId: true,
    status: true,
    availability: true,
    isFeatured: true,
    country: true,
    ageRating: true,
    edition: true,
    volume: true,
    seriesName: true,
    externalUrl: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
    publishedAt: true,
    deletedAt: true,
    comicType: { select: { id: true, name: true, slug: true } },
    createdBy: { select: { id: true, firstName: true, lastName: true } },
  };

  async getCatalog(params: {
    page: number;
    limit: number;
    skip: number;
    search?: string;
    type?: string;
    author?: string;
    publisher?: string;
    year?: number;
    availability?: string;
    featured?: boolean;
    sort?: string;
    order?: string;
  }) {
    const where: Record<string, unknown> = {
      status: "PUBLISHED",
      deletedAt: null,
    };

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { author: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.type) {
      where.comicType = { slug: params.type };
    }

    if (params.author) {
      where.author = { contains: params.author, mode: "insensitive" };
    }

    if (params.publisher) {
      where.publisher = { contains: params.publisher, mode: "insensitive" };
    }

    if (params.year) {
      where.publicationYear = params.year;
    }

    if (params.availability) {
      where.availability = params.availability;
    }

    if (params.featured !== undefined) {
      where.isFeatured = params.featured;
    }

    const orderField = this.getSortField(params.sort || "createdAt");
    const orderDir = params.order === "asc" ? "asc" : "desc";

    const [comics, total] = await Promise.all([
      prisma.comic.findMany({
        where: where as any,
        select: this.comicListSelect,
        skip: params.skip,
        take: params.limit,
        orderBy: { [orderField]: orderDir },
      }),
      prisma.comic.count({ where: where as any }),
    ]);

    return { comics, total };
  }

  async getFeatured(limit = 10) {
    return prisma.comic.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        isFeatured: true,
      },
      select: this.comicListSelect,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async getBySlug(slug: string) {
    const comic = await prisma.comic.findUnique({
      where: { slug },
      select: this.comicDetailSelect,
    });

    if (!comic || comic.deletedAt) {
      throw new NotFoundError("El cómic solicitado no existe");
    }

    if (comic.status !== "PUBLISHED") {
      throw new NotFoundError("El cómic solicitado no existe");
    }

    return comic;
  }

  async getById(id: string, includeNonPublished = false) {
    const comic = await prisma.comic.findUnique({
      where: { id },
      select: this.comicDetailSelect,
    });

    if (!comic || comic.deletedAt) {
      throw new NotFoundError("Cómic no encontrado");
    }

    if (!includeNonPublished && comic.status !== "PUBLISHED") {
      throw new NotFoundError("Cómic no encontrado");
    }

    return comic;
  }

  async create(
    data: {
      title: string;
      originalTitle?: string;
      description?: string;
      synopsis?: string;
      author: string;
      illustrator?: string;
      publisher?: string;
      publicationYear: number;
      issueNumber?: number;
      totalPages?: number;
      language?: string;
      isbn?: string;
      coverImageUrl?: string;
      comicTypeId: string;
      availability?: string;
      country?: string;
      ageRating?: string;
      edition?: string;
      volume?: number;
      seriesName?: string;
      externalUrl?: string;
    },
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const comicType = await prisma.comicType.findUnique({
      where: { id: data.comicTypeId },
    });
    if (!comicType || comicType.deletedAt) {
      throw new NotFoundError("Tipo de cómic no encontrado");
    }

    if (!comicType.isActive) {
      throw new ValidationError("El tipo de cómic no está activo");
    }

    if (data.isbn) {
      const existing = await prisma.comic.findUnique({
        where: { isbn: data.isbn },
      });
      if (existing) {
        throw new ConflictError("El ISBN ya se encuentra registrado");
      }
    }

    const slug = generateUniqueSlug(data.title);

    const comic = await prisma.comic.create({
      data: {
        title: data.title,
        slug,
        originalTitle: data.originalTitle || null,
        description: data.description || null,
        synopsis: data.synopsis || null,
        author: data.author,
        illustrator: data.illustrator || null,
        publisher: data.publisher || null,
        publicationYear: data.publicationYear,
        issueNumber: data.issueNumber || null,
        totalPages: data.totalPages || null,
        language: data.language || "es",
        isbn: data.isbn || null,
        coverImageUrl: data.coverImageUrl || null,
        comicTypeId: data.comicTypeId,
        status: "DRAFT",
        availability: (data.availability as any) || "AVAILABLE",
        country: data.country || null,
        ageRating: data.ageRating || null,
        edition: data.edition || null,
        volume: data.volume || null,
        seriesName: data.seriesName || null,
        externalUrl: data.externalUrl || null,
        createdById: userId,
      },
      select: this.comicDetailSelect,
    });

    await auditService.log({
      userId,
      action: AuditAction.COMIC_CREATED,
      entity: "Comic",
      entityId: comic.id,
      metadata: { title: comic.title },
      ipAddress,
      userAgent,
    });

    return comic;
  }

  async update(
    id: string,
    data: Record<string, unknown>,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.getById(id, true);

    if (data.isbn) {
      const existing = await prisma.comic.findFirst({
        where: { isbn: data.isbn as string, id: { not: id } },
      });
      if (existing) {
        throw new ConflictError("El ISBN ya se encuentra registrado");
      }
    }

    if (data.title && typeof data.title === "string") {
      data.slug = generateUniqueSlug(data.title);
    }

    const comic = await prisma.comic.update({
      where: { id },
      data: data as any,
      select: this.comicDetailSelect,
    });

    await auditService.log({
      userId,
      action: AuditAction.COMIC_UPDATED,
      entity: "Comic",
      entityId: id,
      metadata: { title: comic.title },
      ipAddress,
      userAgent,
    });

    return comic;
  }

  async publish(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const comic = await prisma.comic.findUnique({
      where: { id },
      include: { comicType: true },
    });

    if (!comic || comic.deletedAt) {
      throw new NotFoundError("Cómic no encontrado");
    }

    if (comic.status === "PUBLISHED") {
      throw new ValidationError("El cómic ya está publicado");
    }

    if (comic.status === "ARCHIVED") {
      throw new ValidationError(
        "No se puede publicar un cómic archivado"
      );
    }

    const errors: string[] = [];
    if (!comic.title) errors.push("El título es obligatorio");
    if (!comic.description) errors.push("La descripción es obligatoria");
    if (!comic.author) errors.push("El autor es obligatorio");
    if (!comic.comicType) errors.push("El tipo de cómic es obligatorio");
    if (!comic.comicType?.isActive)
      errors.push("El tipo de cómic debe estar activo");
    if (!comic.publicationYear)
      errors.push("El año de publicación es obligatorio");

    if (errors.length > 0) {
      throw new ValidationError(
        "No se puede publicar el cómic. Campos obligatorios faltantes: " +
          errors.join(", ")
      );
    }

    const updated = await prisma.comic.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      select: this.comicDetailSelect,
    });

    await auditService.log({
      userId,
      action: AuditAction.COMIC_PUBLISHED,
      entity: "Comic",
      entityId: id,
      metadata: { title: updated.title },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async archive(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.getById(id, true);

    const updated = await prisma.comic.update({
      where: { id },
      data: { status: "ARCHIVED" },
      select: this.comicDetailSelect,
    });

    await auditService.log({
      userId,
      action: AuditAction.COMIC_ARCHIVED,
      entity: "Comic",
      entityId: id,
      metadata: { title: updated.title },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async changeStatus(
    id: string,
    status: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.getById(id, true);

    return prisma.comic.update({
      where: { id },
      data: { status: status as any },
      select: this.comicDetailSelect,
    });
  }

  async changeAvailability(
    id: string,
    availability: string
  ) {
    await this.getById(id, true);
    return prisma.comic.update({
      where: { id },
      data: { availability: availability as any },
      select: this.comicDetailSelect,
    });
  }

  async toggleFeatured(id: string, isFeatured: boolean) {
    await this.getById(id, true);
    return prisma.comic.update({
      where: { id },
      data: { isFeatured },
      select: this.comicDetailSelect,
    });
  }

  async softDelete(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.getById(id, true);

    await prisma.comic.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    await auditService.log({
      userId,
      action: AuditAction.COMIC_DELETED,
      entity: "Comic",
      entityId: id,
      ipAddress,
      userAgent,
    });
  }

  async getAdminComics(params: {
    page: number;
    limit: number;
    skip: number;
    search?: string;
    status?: string;
    type?: string;
    availability?: string;
    sort?: string;
    order?: string;
  }) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { author: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.type) {
      where.comicTypeId = params.type;
    }

    if (params.availability) {
      where.availability = params.availability;
    }

    const orderField = this.getSortField(params.sort || "createdAt");
    const orderDir = params.order === "asc" ? "asc" : "desc";

    const [comics, total] = await Promise.all([
      prisma.comic.findMany({
        where: where as any,
        select: this.comicDetailSelect,
        skip: params.skip,
        take: params.limit,
        orderBy: { [orderField]: orderDir },
      }),
      prisma.comic.count({ where: where as any }),
    ]);

    return { comics, total };
  }

  // Favorites
  async addFavorite(userId: string, comicId: string) {
    const comic = await prisma.comic.findUnique({
      where: { id: comicId },
    });

    if (!comic || comic.deletedAt) {
      throw new NotFoundError("Cómic no encontrado");
    }

    if (comic.status !== "PUBLISHED") {
      throw new ValidationError(
        "Solo se pueden agregar favoritos a cómics publicados"
      );
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_comicId: { userId, comicId } },
    });

    if (existing) {
      throw new ConflictError("El cómic ya está en tus favoritos");
    }

    await prisma.favorite.create({
      data: { userId, comicId },
    });
  }

  async removeFavorite(userId: string, comicId: string) {
    const existing = await prisma.favorite.findUnique({
      where: { userId_comicId: { userId, comicId } },
    });

    if (!existing) {
      throw new NotFoundError("El cómic no está en tus favoritos");
    }

    await prisma.favorite.delete({
      where: { userId_comicId: { userId, comicId } },
    });
  }

  async getFavorites(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      include: {
        comic: {
          select: this.comicListSelect,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private getSortField(sort: string): string {
    const allowed = ["title", "author", "publicationYear", "createdAt", "updatedAt"];
    return allowed.includes(sort) ? sort : "createdAt";
  }
}

export const comicService = new ComicService();
