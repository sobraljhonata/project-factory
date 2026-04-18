/**
 * Formato de resposta HTTP com `data` + `links` (estilo REST enriquecido).
 * Para montar links de paginação, use opcionalmente `buildPaginationLinks` em
 * `@/lib/http/hateoas/pagination-links` (não é obrigatório para APIs mínimas).
 */
import { HttpResponse } from "@/core/protocols/http";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Link {
  href: string;
  method: HttpMethod;
}

export interface Links {
  [rel: string]: Link;
}

/** Links com slots opcionais (ex.: paginação). */
export type LinksPagination = Record<string, Link | undefined>;

export interface Resource<T> {
  data: T;
  links: Links | LinksPagination;
  meta?: Record<string, any>;
}

export interface CollectionResource<T> {
  data: Array<T>;
  links: Links | LinksPagination;
  meta?: Record<string, any>;
}

export const resource = <T>(
  data: T,
  links: Links | LinksPagination,
  meta?: Record<string, any>,
): Resource<T> => ({
  data,
  links,
  meta,
});

export const collection = <T>(
  data: Array<T>,
  links: Links | LinksPagination,
  meta?: Record<string, any>,
): CollectionResource<T> => ({
  data,
  links,
  meta,
});

export class ResourceBuilder<T> {
  private links: Links = {};
  private meta: Record<string, any> = {};

  constructor(private readonly data: T) {}

  addOneLink(rel: string, method: HttpMethod, href: string): this {
    this.links[rel] = { method, href };
    return this;
  }

  addAllLinks(links: Links): this {
    this.links = links;
    return this;
  }

  addMeta(itemMeta: Record<string, any>): this {
    this.meta = itemMeta;
    return this;
  }

  build(): Resource<T> {
    return {
      data: this.data,
      links: this.links,
      meta: this.meta,
    };
  }
}

export class CollectionResourceBuilder<T> {
  private links: Links = {};
  private meta: Record<string, any> = {};

  constructor(private readonly data: Array<T>) {}

  addOneLink(rel: string, method: HttpMethod, href: string): this {
    this.links[rel] = { method, href };
    return this;
  }

  addAllLinks(links: Links): this {
    this.links = links;
    return this;
  }

  addMeta(itemMeta: Record<string, any>): this {
    this.meta = itemMeta;
    return this;
  }

  build(): CollectionResource<T> {
    return {
      data: this.data,
      links: this.links,
      meta: this.meta,
    };
  }
}

export const ok = <T>(
  body: Resource<T> | CollectionResource<T>,
): HttpResponse => ({
  statusCode: 200,
  body,
});

export const created = <T>(body: Resource<T>): HttpResponse => ({
  statusCode: 201,
  body,
});

export const noContent = (): HttpResponse => ({
  statusCode: 204,
  body: null,
});
