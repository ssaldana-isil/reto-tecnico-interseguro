import type { Lifecycle, ServerRoute } from '@hapi/hapi';
import type { ValidationError } from 'joi';
import type { AuthController } from '../controllers/auth.controller';
import type { EndorseController } from '../controllers/endorse.controller';
import { errorBody } from '../controllers/error-response';
import { endorseRequestSchema } from '../entities/endorse-request.dto';

/** Errores de Joi → 400 VALIDATION con la lista de problemas. */
const validationFailAction: Lifecycle.Method = (_request, h, err) => {
  const fields = ((err as ValidationError | undefined)?.details ?? []).map((detail) => detail.message);
  return h.response(errorBody('la solicitud no cumple el esquema', 'VALIDATION', { fields })).code(400).takeover();
};

export function buildRoutes(controllers: { auth: AuthController; endorse: EndorseController }): ServerRoute[] {
  return [
    {
      method: 'GET',
      path: '/v1/health',
      handler: () => ({ status: 'ok' }),
    },
    {
      method: 'POST',
      path: '/v1/auth/token',
      handler: controllers.auth.token,
    },
    {
      method: 'POST',
      path: '/v1/endorse/translate',
      options: {
        auth: 'jwt',
        validate: {
          payload: endorseRequestSchema,
          options: { abortEarly: false },
          failAction: validationFailAction,
        },
      },
      handler: controllers.endorse.translate,
    },
  ];
}
