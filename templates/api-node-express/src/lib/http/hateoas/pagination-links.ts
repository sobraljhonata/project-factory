/**
 * Helpers HATEOAS para listagens paginadas — opcional; importe só se usar o padrão
 * `Resource`/`CollectionResource` com links `prev`/`next`/etc.
 */
import type { Link, Links } from "@/core/http/http-resource";

type BuildLinksInput = {
  basePath: string;
  page: number;
  limit: number;
  totalPages: number;
  query?: Record<string, unknown>;
  includeFirstLast?: boolean;
};

function cleanQuery(query: Record<string, unknown>) {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    const s = String(v);
    if (s.trim() === "") continue;
    q[k] = s;
  }
  return q;
}

function buildUrl(basePath: string, query: Record<string, unknown>) {
  const params = new URLSearchParams(cleanQuery(query));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function buildPaginationLinks({
  basePath,
  page,
  limit,
  totalPages,
  query = {},
  includeFirstLast = true,
}: BuildLinksInput): Links {
  const make = (targetPage: number): Link => ({
    href: buildUrl(basePath, { ...query, page: targetPage, limit }),
    method: "GET",
  });

  const links: Links = {
    self: make(page),
  };

  if (page > 1) {
    links.prev = make(page - 1);
    if (includeFirstLast) links.first = make(1);
  }

  if (page < totalPages) {
    links.next = make(page + 1);
    if (includeFirstLast) links.last = make(totalPages);
  }

  return links;
}
