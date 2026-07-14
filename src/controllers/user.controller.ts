import { userService } from "../services/user.service";
import { comicService } from "../services/comic.service";
import { apiSuccess, paginationInfo } from "../utils/api-response";
import type { AuthUser } from "../types/context.types";

export class UserController {
  async getProfile({ user }: { user: AuthUser }) {
    const profile = await userService.getProfile(user.id);
    return apiSuccess("Perfil obtenido exitosamente", profile);
  }

  async updateProfile({ user, body }: { user: AuthUser; body: any }) {
    const profile = await userService.updateProfile(user.id, body);
    return apiSuccess("Perfil actualizado exitosamente", profile);
  }

  async changePassword({
    user,
    body,
  }: {
    user: AuthUser;
    body: { currentPassword: string; newPassword: string };
  }) {
    await userService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword
    );
    return apiSuccess("Contraseña actualizada exitosamente", null);
  }

  async deleteAccount({ user }: { user: AuthUser }) {
    await userService.deleteAccount(user.id);
    return apiSuccess("Cuenta eliminada exitosamente", null);
  }

  async getFavorites({ user, query }: { user: AuthUser; query: any }) {
    const favorites = await comicService.getFavorites(user.id);
    return apiSuccess("Favoritos obtenidos exitosamente", favorites);
  }
}

export const userController = new UserController();
