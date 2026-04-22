/**
 * Normalização de `page` / `limit` / `offset` para listagens — infra REST genérica.
 */
export type PageParams = {
  page?: number;
  limit?: number;
};

export function normalizePagination(params: PageParams, opts?: { maxLimit?: number }) {
  const maxLimit = opts?.maxLimit ?? 50;

  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(maxLimit, Math.max(1, Number(params.limit ?? 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}