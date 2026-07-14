import { Elysia } from "elysia";
import { comicService } from "../services/comic.service";
import { authMiddleware } from "../middlewares/auth.middleware";
import { apiSuccess } from "../utils/api-response";

export const favoriteRoutes = new Elysia()
  .use(authMiddleware)
  .group("/api/v1/favorites", (app) =>
    app
      .get(
        "/",
        async ({ user }) => {
          const favorites = await comicService.getFavorites(user!.id);
          return apiSuccess("Favoritos obtenidos exitosamente", favorites);
        },
        {
          detail: {
            tags: ["Favorites"],
            summary: "Listar favoritos",
            security: [{ bearerAuth: [] }],
          },
        }
      )
      .post(
        "/:comicId",
        async ({ user, params }) => {
          await comicService.addFavorite(user!.id, params.comicId as string);
          return apiSuccess("Cómic agregado a favoritos", null);
        },
        {
          detail: {
            tags: ["Favorites"],
            summary: "Agregar cómic a favoritos",
            security: [{ bearerAuth: [] }],
          },
        }
      )
      .delete(
        "/:comicId",
        async ({ user, params }) => {
          await comicService.removeFavorite(user!.id, params.comicId as string);
          return apiSuccess("Cómic eliminado de favoritos", null);
        },
        {
          detail: {
            tags: ["Favorites"],
            summary: "Eliminar cómic de favoritos",
            security: [{ bearerAuth: [] }],
          },
        }
      )
  );
