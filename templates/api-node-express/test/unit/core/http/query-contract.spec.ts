import * as z from "zod";
import {
  paginationQuerySchema,
  sortQuerySchema,
} from "@/core/http/schemas/query-contract";

describe("query-contract schemas", () => {
  it("paginationQuerySchema aplica defaults e coerce", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.parse({ page: "2", pageSize: "10" })).toEqual({
      page: 2,
      pageSize: 10,
    });
  });

  it("paginationQuerySchema rejeita page < 1", () => {
    expect(() => paginationQuerySchema.parse({ page: "0" })).toThrow();
  });

  it("sortQuerySchema aceita só sortOrder por defeito", () => {
    expect(sortQuerySchema.parse({})).toEqual({ sortOrder: "asc" });
    expect(
      sortQuerySchema.parse({ sortBy: "createdAt", sortOrder: "desc" }),
    ).toEqual({ sortBy: "createdAt", sortOrder: "desc" });
  });

  it("sortQuerySchema rejeita caracteres inválidos em sortBy", () => {
    expect(() => sortQuerySchema.parse({ sortBy: "a;b" })).toThrow();
  });

  it("merge + strict rejeita query param desconhecido (exemplo contrato)", () => {
    const listQuery = paginationQuerySchema.merge(sortQuerySchema).strict();
    expect(() =>
      listQuery.parse({ page: "1", pageSize: "20", extra: "x" }),
    ).toThrow();
    expect(listQuery.parse({ page: "1" })).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
    });
  });

  it("z.strictObject com shape partilhado (alternativa documentada)", () => {
    const schema = z.strictObject({
      ...paginationQuerySchema.shape,
      ...sortQuerySchema.shape,
    });
    expect(() => schema.parse({ page: "1", unknown: "1" })).toThrow();
  });
});
