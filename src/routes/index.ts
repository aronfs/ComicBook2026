import { Elysia } from "elysia";
import { authRoutes } from "./auth.routes";
import { userRoutes } from "./user.routes";
import { comicRoutes } from "./comic.routes";
import { comicTypeRoutes } from "./comic-type.routes";
import { adminRoutes } from "./admin.routes";
import { favoriteRoutes } from "./favorite.routes";

export function setupRoutes(app: Elysia) {
  return app
    .use(authRoutes)
    .use(userRoutes)
    .use(comicRoutes)
    .use(comicTypeRoutes)
    .use(favoriteRoutes)
    .use(adminRoutes);
}
