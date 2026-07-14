import { Elysia, t } from "elysia";
import { comicController } from "../controllers/comic.controller";

export const comicRoutes = new Elysia().group("/api/v1/comics", (app) =>
  app
    .get("/", (ctx) => comicController.getCatalog(ctx as any), {
      detail: {
        tags: ["Comics"],
        summary: "Obtener catálogo de cómics",
        description: "Catálogo público paginado con filtros",
      },
    })
    .get("/featured", (ctx) => comicController.getFeatured(ctx as any), {
      detail: {
        tags: ["Comics"],
        summary: "Obtener cómics destacados",
      },
    })
    .get("/:slug", (ctx) => comicController.getBySlug(ctx as any), {
      detail: {
        tags: ["Comics"],
        summary: "Obtener detalle de un cómic por slug",
      },
    })
);
