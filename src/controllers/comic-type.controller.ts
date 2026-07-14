import { comicTypeService } from "../services/comic-type.service";
import { apiSuccess } from "../utils/api-response";

export class ComicTypeController {
  async getAll({ query }: { query: any }) {
    const isActiveOnly = query.active === "true";
    const types = await comicTypeService.getAll(isActiveOnly);
    return apiSuccess("Tipos de cómic obtenidos exitosamente", types);
  }

  async getBySlug({ params }: { params: { slug: string } }) {
    const type = await comicTypeService.getBySlug(params.slug);
    return apiSuccess("Tipo de cómic obtenido exitosamente", type);
  }
}

export const comicTypeController = new ComicTypeController();
