//App-wide HTTP — unwraps the backend envelope {status, data, meta?};
//raw=true returns the whole body (better-auth endpoints bypass the envelope)
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  raw = false,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new ApiError(res.status, json.message ?? "Request failed");
  return (raw ? json : json.data) as T;
}

async function list<T>(path: string): Promise<Page<T>> {
  const json = await request<{ data: T[]; meta?: PaginationMeta }>(
    path,
    undefined,
    true,
  );
  return { data: json.data, meta: json.meta as PaginationMeta };
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  list: <T>(path: string) => list<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Page<T> {
  data: T[];
  meta: PaginationMeta;
}
