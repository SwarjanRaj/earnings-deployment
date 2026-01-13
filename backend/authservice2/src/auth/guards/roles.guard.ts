import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * Looks at the `@Roles(...)` decorator and the `request.user` injected
 * by JwtStrategy.  Blocks the request if the user’s role is not allowed.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required: UserRole[] | undefined = this.reflector.getAllAndOverride(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!required || required.length === 0) {
      // No @Roles decorator → open to any authenticated user
      return true;
    }

    const { user } = ctx.switchToHttp().getRequest<{ user?: { role: UserRole } }>();
    return user ? required.includes(user.role) : false;
  }
}
