import * as z from "zod";

/**
 * Campos de paginação reutilizáveis para `validateQuery`.
 * Express entrega `req.query` como strings; `z.coerce.number` converte com segurança.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Ordenação mínima sem parser de expressões: campo opcional + direção.
 * Para limitar a colunas conhecidas, combina com outro schema (ex. `z.object({ sortBy: z.enum(["createdAt", "name"]) })`)
 * ou usa `pick`/`merge` conforme a rota.
 */
export const sortQuerySchema = z.object({
  sortBy: z
    .string()
    .max(64)
    .regex(/^[a-zA-Z0-9_.]+$/, "sortBy: apenas letras, dígitos, _ e .")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
