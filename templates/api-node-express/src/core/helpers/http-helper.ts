import { ServerError } from "@/core/errors";
import { HttpResponse } from "@/core/protocols";

export const serverError = (error?: Error | unknown): HttpResponse => ({
  statusCode: 500,
  body: new ServerError(error),
});

export const badRequest = (error: Error): HttpResponse => ({
  statusCode: 400,
  body: error,
});

export const badRequestResource = (resource: any): HttpResponse => ({
  statusCode: 400,
  body: resource,
});

export const unAuthorized = (data?: any): HttpResponse => ({
  statusCode: 401,
  body: data,
});

export const unauthorizedResource = (resource: any): HttpResponse => ({
  statusCode: 401,
  body: resource,
});

export const forbidden = (data?: any): HttpResponse => ({
  statusCode: 403,
  body: data,
});

export const notFound = (data: any): HttpResponse => ({
  statusCode: 404,
  body: data,
});

// export const ok = (data: any): HttpResponse => ({
//   statusCode: 200,
//   body: data,
// });

// export const created = (data: any): HttpResponse => ({
//   statusCode: 201,
//   body: data,
// });


// export const noContent = (): HttpResponse => ({
//   statusCode: 204,
//   body: null,
// });
