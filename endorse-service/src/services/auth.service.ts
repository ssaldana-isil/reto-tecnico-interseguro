import { timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

const ISSUER = 'endorse-service';

export interface AuthSettings {
  jwtSecret: string;
  clientId: string;
  clientSecret: string;
  tokenTtlSeconds: number;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Mismo contrato que routes-service: client credentials → JWT HS256 con sub=clientId. */
export class AuthService {
  constructor(private readonly settings: AuthSettings) {}

  get tokenTtlSeconds(): number {
    return this.settings.tokenTtlSeconds;
  }

  issue(clientId: unknown, clientSecret: unknown): string | null {
    if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
      return null;
    }
    const valid = safeEqual(clientId, this.settings.clientId) && safeEqual(clientSecret, this.settings.clientSecret);
    if (!valid) {
      return null;
    }
    return jwt.sign({}, this.settings.jwtSecret, {
      algorithm: 'HS256',
      subject: clientId,
      issuer: ISSUER,
      expiresIn: this.settings.tokenTtlSeconds,
    });
  }

  /** Valida firma y expiración; devuelve el subject. Lanza si el token no es válido. */
  verify(token: string): string {
    const claims = jwt.verify(token, this.settings.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER });
    return typeof claims === 'string' ? claims : String(claims.sub);
  }
}
