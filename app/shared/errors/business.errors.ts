export abstract class DomainError extends Error {
  readonly statusCode: number;
  readonly isDomainError: boolean;
  readonly name: string;

  constructor(
    message: string = "Domain error",
    statusCode: number = 500,
    name = "Domain error",
  ) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.isDomainError = true;
  }
}

export class PermissionError extends DomainError {
  constructor(message: string = "Unauthorized / Permission denied") {
    super(message, 403, "Permission Error");
  }
}
export class UnauthenticatedError extends DomainError {
  constructor(message: string = "Unauthenticated / unknown user") {
    super(message, 401, "Unauthenticated Error");
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string = "Item does not exist") {
    super(message, 404, "Not Found Error");
  }
}

export class ValidationError extends DomainError {
  constructor(message: string = "Invalid input") {
    super(message, 400, "Validation Error");
  }
}

export class BusinessError extends DomainError {
  constructor(message: string = "Business rule violation") {
    super(message, 422, "Business Error");
  }
}
export class InternalError extends DomainError {
  constructor(message: string = "Internal error from the system") {
    super(message, 500, "Internal Error");
  }
}
