export class ApiError extends Error {
  statusCode: number;
  data: any;
  success: boolean;
  errors: string[];

  constructor(
    statusCode: number,
    message: string = "Something Went Wrong",
    errors: string[] = [],
    stack: string = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ApiResponse<T> {
  statuscode: number;
  data: T;
  message: string;
  success: boolean;

  constructor(statuscode: number, data: T, message: string = "Success") {
    this.statuscode = statuscode;
    this.data = data;
    this.message = message;
    this.success = statuscode < 400;
  }
}
