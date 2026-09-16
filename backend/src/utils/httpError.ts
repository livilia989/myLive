export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (message = "고민 기록을 찾을 수 없어요.") => new HttpError(404, "NOT_FOUND", message);
export const badRequest = (message = "요청 형식이 올바르지 않아요.") => new HttpError(400, "BAD_REQUEST", message);
