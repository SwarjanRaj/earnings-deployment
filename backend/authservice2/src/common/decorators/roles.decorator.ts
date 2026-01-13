import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/** Key Nest uses to store metadata on the handler */
export const ROLES_KEY = 'roles';

/**
 * Usage:
 *   @Roles(UserRole.ADMIN)
 *   @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
