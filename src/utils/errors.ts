interface HttpErrorInput {
  message: string
  statusCode: number
  response?: Response
}

export class HttpError extends Error {
  statusCode: number
  response?: Response

  constructor(input: HttpErrorInput) {
    super(input.message);
    this.response = input.response;
    this.statusCode = input.statusCode;
    this.name = 'HttpError';
  }
}
