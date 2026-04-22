/**
 * Normalização de ordenação a partir de query params — infra REST genérica.
 */
export type SortDirection = "ASC" | "DESC";

export type SortParams<TField extends string> = {
  sortBy?: TField;
  sortDir?: SortDirection | string;
};

export function normalizeSort<TField extends string>(
  params: SortParams<TField>,
  allowed: readonly TField[],
  defaults: { sortBy: TField; sortDir: SortDirection }
) {
  const sortByRaw = params.sortBy;
  const sortDirRaw = String(params.sortDir ?? defaults.sortDir).toUpperCase();

  const sortBy: TField = allowed.includes(sortByRaw as TField)
    ? (sortByRaw as TField)
    : defaults.sortBy;

  const sortDir: SortDirection = sortDirRaw === "DESC" ? "DESC" : "ASC";

  return { sortBy, sortDir };
}