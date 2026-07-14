import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "El nombre solo puede contener letras")
    .optional(),
  lastName: z
    .string()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(50, "El apellido no puede exceder 50 caracteres")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      "El apellido solo puede contener letras"
    )
    .optional(),
  username: z
    .string()
    .min(3, "El username debe tener al menos 3 caracteres")
    .max(30, "El username no puede exceder 30 caracteres")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "El username solo puede contener letras, números y guión bajo"
    )
    .optional(),
  avatarUrl: z.string().url("La URL del avatar no es válida").optional(),
});

export const adminUpdateUserRoleSchema = z.object({
  role: z.enum(["USER", "EDITOR", "ADMIN"], {
    errorMap: () => ({ message: "El rol debe ser USER, EDITOR o ADMIN" }),
  }),
});

export const adminUpdateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"], {
    errorMap: () => ({
      message: "El estado debe ser ACTIVE, INACTIVE o SUSPENDED",
    }),
  }),
});
