import type { Request, ResponseToolkit } from '@hapi/hapi';
import type { AuthService } from '../services/auth.service';
import { errorBody } from './error-response';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  token = (request: Request, h: ResponseToolkit) => {
    const payload = request.payload;
    if (typeof payload !== 'object' || payload === null) {
      return h.response(errorBody('cuerpo inválido', 'BAD_REQUEST')).code(400);
    }
    const { clientId, clientSecret } = payload as Record<string, unknown>;
    const token = this.authService.issue(clientId, clientSecret);
    if (!token) {
      return h.response(errorBody('credenciales inválidas', 'UNAUTHORIZED')).code(401);
    }
    return h
      .response({ accessToken: token, tokenType: 'Bearer', expiresIn: this.authService.tokenTtlSeconds })
      .code(200);
  };
}
