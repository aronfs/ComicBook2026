import { comicService } from "../services/comic.service";
import { apiSuccess, paginationInfo } from "../utils/api-response";

export class ComicController {
  async getCatalog({ query }: { query: any }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { comics, total } = await comicService.getCatalog({
      page,
      limit,
      skip,
      search: query.search,
      type: query.type,
      author: query.author,
      publisher: query.publisher,
      year: query.year,
      availability: query.availability,
      featured: query.featured,
      sort: query.sort,
      order: query.order,
    });

    return apiSuccess("Catálogo obtenido exitosamente", comics, {
      ...paginationInfo(page, limit, total),
    });
  }

  async getFeatured({ query }: { query: any }) {
    const limit = Math.min(parseInt(query.limit) || 10, 50);
    const comics = await comicService.getFeatured(limit);
    return apiSuccess("Cómics destacados obtenidos exitosamente", comics);
  }

  async getBySlug({ params }: { params: { slug: string } }) {
    const comic = await comicService.getBySlug(params.slug);
    return apiSuccess("Cómic obtenido exitosamente", comic);
  }

  async getComicsByType({ params, query }: { params: { slug: string }; query: any }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { comics, total } = await comicService.getCatalog({
      page,
      limit,
      skip,
      type: params.slug,
      search: query.search,
      sort: query.sort,
      order: query.order,
    });

    return apiSuccess("Cómics obtenidos exitosamente", comics, {
      ...paginationInfo(page, limit, total),
    });
  }
}

export const comicController = new ComicController();
