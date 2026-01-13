// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';

// strongly-typed payload (optional but nice)
interface JwtPayload {
  sub:   string;
  email: string;
  role:  UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // assert it really exists → cast to string
      secretOrKey    : process.env.JWT_SECRET as string,
    });
  }

  /* Pass validated payload downstream (becomes req.user) */
  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
