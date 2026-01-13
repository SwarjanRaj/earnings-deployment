import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private prisma: PrismaService, private http: HttpService) {}

  // Map auth service roles to admin service roles
  private mapRole(authRole: string): 'USER' | 'ADMIN' | 'BLOCKED' | 'SUPER_ADMIN' {
    const roleMap: { [key: string]: 'USER' | 'ADMIN' | 'BLOCKED' | 'SUPER_ADMIN' } = {
      'USER': 'USER',
      'ADMIN': 'ADMIN', 
      'SUPERADMIN': 'SUPER_ADMIN'
    };
    return roleMap[authRole] || 'USER'; // default to USER if unknown
  }

  async getLoginActivity(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return this.prisma.loginActivity.findMany({
      where: { userId: user?.id },
      orderBy: { lastLogin: 'desc' },
    });
  }

  async setRoleByEmail(email: string, role: string) {
    return this.prisma.user.update({
      where: { email },
      data: { role: role as any },
    });
  }

  async deleteUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deleting admins unless you're a super admin
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') {
        throw new Error('Cannot delete admin users');
      }

      await this.prisma.user.delete({
        where: { id: userId },
      });

      return {
        id: userId,
        message: 'User deleted successfully',
      };
    } catch (error) {
      this.logger.error('Delete user failed:', error);
      throw error;
    }
  }

  async bulkDeleteUsers(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new Error('No user IDs provided for deletion');
    }

    try {
      const result = await this.prisma.user.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      return {
        deletedCount: result.count,
        message: `Successfully deleted ${result.count} users`,
      };
    } catch (error) {
      this.logger.error('Bulk delete users failed:', error);
      throw new Error(`Bulk delete failed: ${error.message}`);
    }
  }

  async blockUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Prevent blocking admins unless you're a super admin
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') {
        throw new Error('Cannot block admin users');
      }

      return this.prisma.user.update({
        where: { id: userId },
        data: { suspended: true },
      });
    } catch (error) {
      this.logger.error('Block user failed:', error);
      throw error;
    }
  }

  async unblockUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return this.prisma.user.update({
        where: { id: userId },
        data: { suspended: false },
      });
    } catch (error) {
      this.logger.error('Unblock user failed:', error);
      throw error;
    }
  }

  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async getAllUsersPaginated(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    // Show all users including temp.local emails
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: users,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  // Automatic sync every 5 minutes (temporarily disabled)
  // @Cron(CronExpression.EVERY_5_MINUTES)
  async syncUsersFromAuth() {
    try {
      const { data: users } = await firstValueFrom(
        this.http.get('http://auth-service:3001/api/users/all')
      );
      if (!Array.isArray(users)) {
        this.logger.error('Auth service /api/users/all did not return an array');
        return;
      }
      for (const user of users) {
        const mappedRole = this.mapRole(user.role);
        await this.prisma.user.upsert({
          where: { email: user.email },
          update: {
            username: user.username,
            role: mappedRole,
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
          },
          create: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: mappedRole,
            createdAt: user.createdAt ? new Date(user.createdAt) : undefined,
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
            password: '', // placeholder, since we don't sync passwords
          },
        });
      }
      this.logger.log(`Synced ${users.length} users from auth service`);
    } catch (error) {
      this.logger.error('Failed to sync users from auth service', error);
    }
  }
}
