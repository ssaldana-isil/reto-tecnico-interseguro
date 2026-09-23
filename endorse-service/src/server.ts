import Hapi, { type Server } from '@hapi/hapi';
import Joi from 'joi';
import type { DataSource } from 'typeorm';
import type { AppConfig } from './config';
import { AuthController } from './controllers/auth.controller';
import { EndorseController } from './controllers/endorse.controller';
import { errorBody } from './controllers/error-response';
import { TypeOrmPlantillaRepository } from './repositories/plantilla.repository';
import { buildRoutes } from './routes';
import { AuthService } from './services/auth.service';
import { TranslateService } from './services/translate.service';

const codeByStatus: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
};

/** Composition root: arma repositorios, servicios y controllers, y registra auth y rutas. */
export async function createServer(config: AppConfig, dataSource: DataSource): Promise<Server> {
  const authService = new AuthService(config);
  const translateService = new TranslateService(new TypeOrmPlantillaRepository(dataSource));

  const server = Hapi.server({ port: config.port, routes: { cors: { origin: config.corsOrigin } } });
  server.validator(Joi);

  server.auth.scheme('jwt-bearer', () => ({
    authenticate: (request, h) => {
      const raw: unknown = request.headers.authorization;
      const header = typeof raw === 'string' ? raw : '';
      if (!header.startsWith('Bearer ')) {
        return h
          .response(errorBody('se requiere Authorization: Bearer <token>', 'UNAUTHORIZED'))
          .code(401)
          .takeover();
      }
      try {
        const subject = authService.verify(header.slice('Bearer '.length));
        return h.authenticated({ credentials: { sub: subject } });
      } catch (err) {
        const message = err instanceof Error && err.name === 'TokenExpiredError' ? 'token expirado' : 'token inválido';
        return h.response(errorBody(message, 'UNAUTHORIZED')).code(401).takeover();
      }
    },
  }));
  server.auth.strategy('jwt', 'jwt-bearer');

  server.route(
    buildRoutes({
      auth: new AuthController(authService),
      endorse: new EndorseController(translateService),
    }),
  );

  // Los errores que genera Hapi (Boom) salen con el mismo formato {error, code}.
  server.ext('onPreResponse', (request, h) => {
    const response = request.response;
    if (!('isBoom' in response) || !response.isBoom) {
      return h.continue;
    }
    const status = response.output.statusCode;
    if (status >= 500) {
      console.error(response);
      return h.response(errorBody('error interno', 'INTERNAL')).code(500);
    }
    return h.response(errorBody(response.message, codeByStatus[status] ?? 'ERROR')).code(status);
  });

  return server;
}
