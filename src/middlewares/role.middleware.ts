import { ForbiddenError } from "../utils/api-error";

export function checkRole(user: { role?: string } | undefined, allowedRoles: string[]): void {
  if (!user) {
    throw new ForbiddenError("No autorizado");
  }
  if (!allowedRoles.includes(user.role || "")) {
    throw new ForbiddenError("No tienes permisos para realizar esta acción");
  }
}
