import { z } from "zod";

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1))
    .pipe(z.number().int().min(1, "La página debe ser mayor o igual a 1")),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 20))
    .pipe(
      z
        .number()
        .int()
        .min(1, "El límite debe ser mayor o igual a 1")
        .max(100, "El límite no puede exceder 100")
    ),
  search: z.string().optional(),
  sort: z
    .enum(["title", "author", "publicationYear", "createdAt", "updatedAt"], {
      errorMap: () => ({
        message:
          "El campo de ordenamiento debe ser title, author, publicationYear, createdAt o updatedAt",
      }),
    })
    .optional(),
  order: z
    .enum(["asc", "desc"], {
      errorMap: () => ({
        message: "El orden debe ser asc o desc",
      }),
    })
    .optional(),
});

export const comicFilterSchema = paginationSchema.extend({
  type: z.string().uuid("El ID del tipo no es válido").optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  year: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined))
    .pipe(
      z
        .number()
        .int()
        .min(1800)
        .max(2100)
        .optional()
    ),
  availability: z
    .enum(["AVAILABLE", "UNAVAILABLE", "COMING_SOON"])
    .optional(),
  featured: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined))
    .pipe(z.boolean().optional()),
});

export const userFilterSchema = paginationSchema.extend({
  role: z.enum(["USER", "EDITOR", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("El ID proporcionado no es válido"),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1, "El slug es obligatorio"),
});
