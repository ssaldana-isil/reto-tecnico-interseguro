/** Cuerpo de error común a todos los endpoints: {error, code, details?}. */
export interface ErrorBody {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export function errorBody(error: string, code: string, details?: Record<string, unknown>): ErrorBody {
  return details ? { error, code, details } : { error, code };
}
