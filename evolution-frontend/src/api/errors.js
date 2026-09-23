/**
 * Error normalizado a partir del sobre {error, code, details} que devuelven ambos servicios.
 * Los errores generados en el cliente (red, configuración, JSON inválido) usan el mismo formato.
 */
export class ApiError extends Error {
  constructor({ status = 0, code, message, details = null }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Etiquetas a listar: details.missingFields (422 de endosos) o details.fields (400 de Joi). */
  get items() {
    const d = this.details ?? {};
    if (Array.isArray(d.missingFields)) return d.missingFields;
    if (Array.isArray(d.fields)) return d.fields;
    return [];
  }
}

/** Convierte una respuesta HTTP no exitosa en ApiError, tolerando cuerpos que no sigan el sobre. */
export function toApiError(status, body) {
  if (body && typeof body === 'object' && typeof body.code === 'string') {
    return new ApiError({ status, code: body.code, message: body.error ?? '', details: body.details ?? null });
  }
  return new ApiError({ status, code: `HTTP_${status}`, message: 'respuesta inesperada del servidor' });
}
