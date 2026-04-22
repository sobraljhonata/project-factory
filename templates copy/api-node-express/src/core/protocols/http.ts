export interface HttpResponse<T = any> {
  statusCode: number;
  body: T;
}

export interface HttpRequest {
  body?: any;
  params?: any;
  query?: any;
  /** Query validado por `validateQuery` (Zod); preferir na controller quando disponível. */
  validatedQuery?: unknown;
  headers?: any;
  pathParams?: any;
  user?: any;
  correlationId?: string;
}