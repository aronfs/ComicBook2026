import { Elysia, t } from "elysia";
import { comicTypeController } from "../controllers/comic-type.controller";
import { comicController } from "../controllers/comic.controller";

export const comicTypeRoutes = new Elysia().group(
  "/api/v1/comic-types",
  (app) =>
    app
      .get("/", (ctx) => comicTypeController.getAll(ctx as any), {
        detail: {
          tags: ["Comic Types"],
          summary: "Obtener tipos de cómic",
        },
      })
      .get("/:slug", (ctx) => comicTypeController.getBySlug(ctx as any), {
        detail: {
          tags: ["Comic Types"],
          summary: "Obtener tipo de cómic por slug",
        },
      })
      .get("/:slug/comics", (ctx) => comicController.getComicsByType(ctx as any), {
        detail: {
          tags: ["Comic Types"],
          summary: "Obtener cómics por tipo",
        },
      })
);
