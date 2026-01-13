import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, UseInterceptors, UploadedFile, Res, HttpStatus, HttpException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { SetRoleDto } from './dto/set-role.dto';
import { AuditService } from '../audit/audit.service';
import { ChatService } from '../chat/chat.service';
import { RateLimitService } from '../chat/rate-limit.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
    private readonly chatService: ChatService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'admin-service' };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    return this.adminService.getAllUsersPaginated(parseInt(page), parseInt(pageSize));
  }

  @Get('users/:email/login-activity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getLoginActivity(@Param('email') email: string) {
    return this.adminService.getLoginActivity(email);
  }

  @Post('users/:email/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async setRoleByEmail(
    @Param('email') email: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.setRoleByEmail(email, body.role);
  }

  @Post('sync-users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async syncUsers() {
    return this.adminService.syncUsersFromAuth();
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Delete('users/bulk/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async bulkDeleteUsers(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteUsers(body.ids);
  }

  @Post('users/:userId/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async blockUser(@Param('userId') userId: string) {
    return this.adminService.blockUser(userId);
  }

  @Post('users/:userId/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async unblockUser(@Param('userId') userId: string) {
    return this.adminService.unblockUser(userId);
  }

  // Audit logs
  @Get('audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAuditLogs({
      action,
      entity,
      entityId,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  // Rate limit management
  @Get('users/:userId/rate-limit-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getRateLimitStatus(@Param('userId') userId: string) {
    return this.rateLimitService.getRateLimitStatus(userId);
  }

  @Post('users/:userId/reset-rate-limit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async resetRateLimit(@Param('userId') userId: string, @Req() req) {
    await this.rateLimitService.resetRateLimit(userId);
    
    // Audit log
    await this.auditService.logAdminAction(
      req.user.userId,
      'RESET_RATE_LIMIT',
      'User',
      userId,
      { adminId: req.user.userId },
    );

    return { message: 'Rate limit reset successfully', userId };
  }
}
