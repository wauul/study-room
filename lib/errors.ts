export class HttpError extends Error {
  readonly expected: boolean;
  constructor(public status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "HttpError";
    this.expected = status >= 400 && status < 500;
  }
}
