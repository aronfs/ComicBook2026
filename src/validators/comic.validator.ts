import { z } from "zod";

export const createComicSchema = z.object({
  title: z
    .string()
    .min(2, "El título debe tener al menos 2 caracteres")
    .max(150, "El título no puede exceder 150 caracteres"),
  originalTitle: z
    .string()
    .max(150, "El título original no puede exceder 150 caracteres")
    .optional(),
  description: z
    .string()
    .max(5000, "La descripción no puede exceder 5000 caracteres")
    .optional(),
  synopsis: z
    .string()
    .max(10000, "La sinopsis no puede exceder 10000 caracteres")
    .optional(),
  author: z
    .string()
    .min(2, "El autor debe tener al menos 2 caracteres")
    .max(100, "El autor no puede exceder 100 caracteres"),
  illustrator: z
    .string()
    .max(100, "El ilustrador no puede exceder 100 caracteres")
    .optional(),
  publisher: z
    .string()
    .max(100, "La editorial no puede exceder 100 caracteres")
    .optional(),
  publicationYear: z
    .number()
    .int("El año debe ser un número entero")
    .min(1800, "El año debe ser mayor o igual a 1800")
    .max(2100, "El año debe ser menor o igual a 2100"),
  issueNumber: z
    .number()
    .int("El número de edición debe ser un número entero")
    .min(0, "El número de edición no puede ser negativo")
    .optional(),
  totalPages: z
    .number()
    .int("El total de páginas debe ser un número entero")
    .min(1, "El total de páginas debe ser mayor a 0")
    .optional(),
  language: z
    .string()
    .max(10, "El idioma no puede exceder 10 caracteres")
    .optional(),
  isbn: z
    .string()
    .max(20, "El ISBN no puede exceder 20 caracteres")
    .optional(),
  coverImageUrl: z
    .string()
    .url("La URL de la portada no es válida")
    .optional(),
  comicTypeId: z.string().uuid("El ID del tipo de cómic no es válido"),
  availability: z
    .enum(["AVAILABLE", "UNAVAILABLE", "COMING_SOON"], {
      errorMap: () => ({
        message:
          "La disponibilidad debe ser AVAILABLE, UNAVAILABLE o COMING_SOON",
      }),
    })
    .optional(),
  country: z
    .string()
    .max(100, "El país no puede exceder 100 caracteres")
    .optional(),
  ageRating: z
    .string()
    .max(20, "La clasificación de edad no puede exceder 20 caracteres")
    .optional(),
  edition: z
    .string()
    .max(50, "La edición no puede exceder 50 caracteres")
    .optional(),
  volume: z
    .number()
    .int("El volumen debe ser un número entero")
    .min(1, "El volumen debe ser mayor a 0")
    .optional(),
  seriesName: z
    .string()
    .max(150, "El nombre de la serie no puede exceder 150 caracteres")
    .optional(),
  externalUrl: z
    .string()
    .url("La URL externa no es válida")
    .optional(),
});

export const updateComicSchema = createComicSchema.partial();

export const comicStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"], {
    errorMap: () => ({
      message: "El estado debe ser DRAFT, PUBLISHED o ARCHIVED",
    }),
  }),
});

export const comicAvailabilitySchema = z.object({
  availability: z.enum(["AVAILABLE", "UNAVAILABLE", "COMING_SOON"], {
    errorMap: () => ({
      message:
        "La disponibilidad debe ser AVAILABLE, UNAVAILABLE o COMING_SOON",
    }),
  }),
});

export const comicFeaturedSchema = z.object({
  isFeatured: z.boolean({
    errorMap: () => ({ message: "isFeatured debe ser un booleano" }),
  }),
});
