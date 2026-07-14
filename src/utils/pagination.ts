export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPaginationParams(
  page?: number | string,
  limit?: number | string
): PaginationParams {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return {
    page: p,
    limit: l,
    skip: (p - 1) * l,
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function parseSort(
  sort?: string,
  defaultSort = "createdAt"
): { field: string; order: "asc" | "desc" }[] {
  const allowedFields = [
    "title",
    "author",
    "publicationYear",
    "createdAt",
    "updatedAt",
  ];
  const field = sort && allowedFields.includes(sort) ? sort : defaultSort;
  return [{ field, order: "desc" } as { field: string; order: "asc" | "desc" }];
}
