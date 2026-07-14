export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  pagination?: PaginationInfo;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ValidationErrorItem[];
}

export interface ValidationErrorItem {
  field: string;
  message: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function apiSuccess<T>(
  message: string,
  data: T,
  pagination?: PaginationInfo
): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  };
}

export function apiError(
  message: string,
  errors?: ValidationErrorItem[]
): ApiErrorResponse {
  return {
    success: false,
    message,
    ...(errors ? { errors } : {}),
  };
}

export function paginationInfo(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
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
