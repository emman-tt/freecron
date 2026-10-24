export const FIRST_PAGE_CACHE_LIMIT = 20;
export const FIRST_PAGE_CACHE_TTL = 60;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// What the client asks for.
export interface PaginationParams {
  page: number;
  limit: number;
}

// What the database needs.
export interface PageSlice {
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Controllers validate via zod; this is pure offset math.
export function resolvePagination(input: PaginationParams): PageSlice {
  return {
    limit: input.limit,
    offset: (input.page - 1) * input.limit,
  };
}

export function toPaginated<T>(
  rows: T[],
  total: number,
  pagination: PaginationParams,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pagination.limit);
  return {
    data: rows,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1 && totalPages > 0,
    },
  };
}
