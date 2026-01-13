import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Wraps passport-jwt so we can tweak defaults later if needed */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
