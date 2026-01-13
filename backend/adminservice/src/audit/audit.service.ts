import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Audit Service
 * 
 * Centralized audit logging for all admin actions and important events.
 * Records: who, what, when, where, on whom
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event
   * @param action Action performed (e.g., 'DELETE_MESSAGE', 'SUSPEND_USER')
   * @param entity Entity type (e.g., 'Message', 'User', 'Topic')
   * @param entityId ID of the affected entity
   * @param details Additional details as JSON string or object
   * @param userId ID of the user who performed the action
   */
  async log(
    action: string,
    entity: string,
    entityId?: string,
    details?: string | object,
    userId?: string,
  ) {
    try {
      const detailsString = typeof details === 'object' ? JSON.stringify(details) : details;

      const auditLog = await this.prisma.auditLog.create({
        data: {
          action,
          entity,
          entityId,
          details: detailsString,
          userId,
        },
      });

      this.logger.log(`Audit log created: ${action} on ${entity} ${entityId || ''} by ${userId || 'system'}`);
      return auditLog;
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${action} on ${entity}`, error);
      // Don't throw - audit logging should not break the main flow
      return null;
    }
  }

  /**
   * Log admin action with context
   * @param adminId Admin user ID
   * @param action Action performed
   * @param entity Entity type
   * @param entityId Affected entity ID
   * @param context Additional context (will be stringified)
   */
  async logAdminAction(
    adminId: string,
    action: string,
    entity: string,
    entityId?: string,
    context?: object,
  ) {
    return this.log(action, entity, entityId, context, adminId);
  }

  /**
   * Get audit logs with filtering
   * @param filters Filter options
   */
  async getAuditLogs(filters?: {
    action?: string;
    entity?: string;
    entityId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.entity) {
      where.entity = filters.entity;
    }
    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
