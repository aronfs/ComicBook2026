export class ApiError extends Error {
  public statusCode: number;
  public errors?: { field: string; message: string }[];

  constructor(
    statusCode: number,
    message: string,
    errors?: { field: string; message: string }[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    errors?: { field: string; message: string }[]
  ) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "No autorizado") {
    super(401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "No tienes permisos para realizar esta acción") {
    super(403, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Recurso no encontrado") {
    super(404, message);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "El recurso ya existe") {
    super(409, message);
  }
}

export class DatabaseError extends ApiError {
  constructor(message = "Error en la base de datos") {
    super(500, message);
  }
}
