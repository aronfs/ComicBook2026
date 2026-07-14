export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface ComicQuery extends PaginationQuery {
  type?: string;
  author?: string;
  publisher?: string;
  year?: number;
  availability?: string;
  featured?: boolean;
}

export interface UserQuery extends PaginationQuery {
  role?: string;
  status?: string;
}
