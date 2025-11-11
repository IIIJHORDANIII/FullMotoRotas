export class AppError extends Error {
  constructor(public message: string, public status: number = 400, public code?: string) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(message: string, code = "NOT_FOUND") {
  return new AppError(message, 404, code);
}

export function unauthorized(message: string, code = "UNAUTHORIZED") {
  return new AppError(message, 401, code);
}

export function forbidden(message: string, code = "FORBIDDEN") {
  return new AppError(message, 403, code);
}

export function conflict(message: string, code = "CONFLICT") {
  return new AppError(message, 409, code);
}
