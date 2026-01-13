import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { RpcException } from '@nestjs/microservices';
  import { ROLES_KEY } from '../decorators/roles.decorator';
  import { UserRole } from '../enums/user-role.enum';
  
  @Injectable()
  export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}
  
    canActivate(ctx: ExecutionContext): boolean {
      const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (!requiredRoles || requiredRoles.length === 0) return true;
  
      let userRole: UserRole | undefined;
  
      switch (ctx.getType<string>()) {
        case 'http': {
          const request = ctx.switchToHttp().getRequest<{ user?: { role?: UserRole } }>();
          userRole = request.user?.role;
          break;
        }
        case 'rpc': {
          const data = ctx.switchToRpc().getData() as any;
          const context = ctx.switchToRpc().getContext() as any;
          userRole = data?.user?.role ?? context?.user?.role;
          break;
        }
        case 'ws': {
          const client = ctx.switchToWs().getClient<{ handshake?: { user?: { role?: UserRole } } }>();
          userRole = client?.handshake?.user?.role;
          break;
        }
      }
  
      const allowed = userRole && requiredRoles.includes(userRole);
      if (allowed) return true;
  
      const error = new UnauthorizedException('Forbidden: Insufficient role');
      if (ctx.getType<string>() === 'rpc') throw new RpcException(error);
      throw error;
    }
  }
  