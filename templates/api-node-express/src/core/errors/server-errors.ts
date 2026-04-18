export class ServerError extends Error {
  constructor(error?: Error | unknown) {
    super("Internal server error");
    this.name = "ServerError";
    if (error && error instanceof Error) {
      this.name = error?.message;
      this.message = error?.message;
      this.stack = error?.stack;
    }
  }
}