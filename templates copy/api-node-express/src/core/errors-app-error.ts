export interface AppErrorParams {
  code: string;
  message: string;
  statusCode?: number;
  details?: unknown;
}
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.message = params.message;
    this.name = "AppError";
    this.code = params.code;
    this.statusCode = params.statusCode ?? 400;
    this.details = params.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}