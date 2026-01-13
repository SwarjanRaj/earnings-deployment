// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService }                from '../prisma/prisma.service';
import { User, UserRole }               from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------------------------- queries */

  findByEmail(email: string, includePasswordHash = false) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isVerified: true,
        ...(includePasswordHash ? { passwordHash: true } : {}),
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /* ------------------------------------------------- create  */
  /**
   * Unified helper used by both password **and** SSO flows.
   * Pass `null` for `passwordHash` when the user signs in via Google.
   * `dob` is optional; pass `undefined` to omit it.
   */
  async create(
    email:        string,
    username:     string,
    passwordHash: string | null,
    role:         UserRole        = UserRole.USER,
    firstName?:   string,
    lastName?:    string,
    dob?:         Date | string,
    isVerified:   boolean         = false,
  ): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        username,
        role,
        isVerified,
        ...(passwordHash ? { passwordHash } : {}),
        ...(firstName    ? { firstName }    : {}),
        ...(lastName     ? { lastName }     : {}),
        ...(dob          ? { dob }          : {}),
      },
    });
  }

  /* ------------------------------------------------- updates */

  markVerified(id: string) {
    return this.prisma.user.update({
      where: { id },
      data : { isVerified: true },
    });
  }

  async updatePasswordByEmail(email: string, newHash: string) {
    const user = await this.findByEmail(email);
    if (!user) throw new NotFoundException(`User ${email} not found`);

    return this.prisma.user.update({
      where: { email },
      data : { passwordHash: newHash },
    });
  }

  async getAllSafe() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
