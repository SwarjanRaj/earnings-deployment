import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Rate Limiting Service
 * 
 * Implements message rate limiting per user to prevent spam and abuse.
 * Features:
 * - Configurable message limits per time window
 * - Temporary mute when limit exceeded
 * - Escalation to admin block after repeated violations
 * - Redis-based tracking for performance
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  
  // Rate limiting configuration (can be overridden by env vars)
  private readonly MESSAGES_PER_MINUTE: number;
  private readonly MESSAGES_PER_HOUR: number;
  private readonly MUTE_DURATION_MINUTES: number;
  private readonly VIOLATIONS_BEFORE_BLOCK: number;
  private readonly VIOLATION_RESET_HOURS: number;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {
    // Load configuration from environment variables with sensible defaults
    this.MESSAGES_PER_MINUTE = parseInt(process.env.CHAT_MESSAGES_PER_MINUTE || '30', 10);
    this.MESSAGES_PER_HOUR = parseInt(process.env.CHAT_MESSAGES_PER_HOUR || '200', 10);
    this.MUTE_DURATION_MINUTES = parseInt(process.env.CHAT_MUTE_DURATION_MINUTES || '5', 10);
    this.VIOLATIONS_BEFORE_BLOCK = parseInt(process.env.CHAT_VIOLATIONS_BEFORE_BLOCK || '3', 10);
    this.VIOLATION_RESET_HOURS = parseInt(process.env.CHAT_VIOLATION_RESET_HOURS || '24', 10);

    this.logger.log(`Rate limiting configured: ${this.MESSAGES_PER_MINUTE} msg/min, ${this.MESSAGES_PER_HOUR} msg/hour`);
  }

  /**
   * Check if user can send a message (rate limit check)
   * @param userId User ID
   * @returns Object with allowed status and remaining time if muted
   */
  async checkRateLimit(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number; // seconds until mute expires
    remainingMessages?: number;
  }> {
    try {
      // Check if user is currently muted
      const muteKey = `mute:${userId}`;
      const muteData = await this.redis.get(muteKey);
      
      if (muteData) {
        const muteInfo = JSON.parse(muteData);
        const muteExpiresAt = new Date(muteInfo.expiresAt).getTime();
        const now = Date.now();
        
        if (now < muteExpiresAt) {
          const retryAfter = Math.ceil((muteExpiresAt - now) / 1000);
          return {
            allowed: false,
            reason: `You are temporarily muted for ${this.MUTE_DURATION_MINUTES} minutes due to exceeding message rate limits. Please wait before sending more messages.`,
            retryAfter,
          };
        } else {
          // Mute expired, remove it
          await this.redis.del(muteKey);
        }
      }

      // Check per-minute limit
      const minuteKey = `rate:minute:${userId}`;
      const minuteCount = await this.redis.incr(minuteKey);
      
      if (minuteCount === 1) {
        // First message in this minute, set expiration
        await this.redis.expire(minuteKey, 60);
      }

      if (minuteCount > this.MESSAGES_PER_MINUTE) {
        // Exceeded per-minute limit
        await this.handleViolation(userId, 'minute');
        return {
          allowed: false,
          reason: `You have exceeded the message rate limit (${this.MESSAGES_PER_MINUTE} messages per minute). You have been temporarily muted.`,
          retryAfter: this.MUTE_DURATION_MINUTES * 60,
        };
      }

      // Check per-hour limit
      const hourKey = `rate:hour:${userId}`;
      const hourCount = await this.redis.incr(hourKey);
      
      if (hourCount === 1) {
        // First message in this hour, set expiration
        await this.redis.expire(hourKey, 3600);
      }

      if (hourCount > this.MESSAGES_PER_HOUR) {
        // Exceeded per-hour limit
        await this.handleViolation(userId, 'hour');
        return {
          allowed: false,
          reason: `You have exceeded the message rate limit (${this.MESSAGES_PER_HOUR} messages per hour). You have been temporarily muted.`,
          retryAfter: this.MUTE_DURATION_MINUTES * 60,
        };
      }

      // Calculate remaining messages
      const remainingMinute = Math.max(0, this.MESSAGES_PER_MINUTE - minuteCount);
      const remainingHour = Math.max(0, this.MESSAGES_PER_HOUR - hourCount);
      const remainingMessages = Math.min(remainingMinute, remainingHour);

      return {
        allowed: true,
        remainingMessages,
      };
    } catch (error) {
      this.logger.error(`Error checking rate limit for user ${userId}:`, error);
      // On error, allow the message (fail open) but log the error
      return {
        allowed: true,
        remainingMessages: undefined,
      };
    }
  }

  /**
   * Handle rate limit violation
   * - Apply temporary mute
   * - Track violation count
   * - Escalate to admin block if threshold reached
   */
  private async handleViolation(userId: string, type: 'minute' | 'hour'): Promise<void> {
    try {
      // Apply temporary mute
      const muteExpiresAt = new Date(Date.now() + this.MUTE_DURATION_MINUTES * 60 * 1000);
      const muteKey = `mute:${userId}`;
      await this.redis.setex(
        muteKey,
        this.MUTE_DURATION_MINUTES * 60,
        JSON.stringify({
          userId,
          expiresAt: muteExpiresAt.toISOString(),
          reason: `Rate limit violation (${type})`,
        })
      );

      // Track violation count
      const violationKey = `violations:${userId}`;
      const violationCount = await this.redis.incr(violationKey);
      
      if (violationCount === 1) {
        // First violation, set expiration
        await this.redis.expire(violationKey, this.VIOLATION_RESET_HOURS * 3600);
      }

      // Store violation details in database for audit
      await this.prisma.auditLog.create({
        data: {
          action: 'RATE_LIMIT_VIOLATION',
          entity: 'User',
          entityId: userId,
          details: JSON.stringify({
            type,
            violationCount,
            muteDuration: this.MUTE_DURATION_MINUTES,
          }),
          userId: userId,
        },
      });

      this.logger.warn(`Rate limit violation for user ${userId}: ${violationCount} violations (${type})`);

      // Check if we should escalate to admin block
      if (violationCount >= this.VIOLATIONS_BEFORE_BLOCK) {
        await this.escalateToBlock(userId, violationCount);
      }
    } catch (error) {
      this.logger.error(`Error handling violation for user ${userId}:`, error);
    }
  }

  /**
   * Escalate repeated violations to admin block (suspend user)
   */
  private async escalateToBlock(userId: string, violationCount: number): Promise<void> {
    try {
      // Check if user is already suspended
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { suspended: true, role: true },
      });

      if (!user) {
        this.logger.error(`Cannot escalate: user ${userId} not found`);
        return;
      }

      // Don't auto-suspend admins (they should be manually reviewed)
      if (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN') {
        this.logger.warn(`Skipping auto-suspend for admin user ${userId} (${violationCount} violations)`);
        // Still log it for manual review
        await this.prisma.auditLog.create({
          data: {
            action: 'RATE_LIMIT_ESCALATION_SKIPPED',
            entity: 'User',
            entityId: userId,
            details: JSON.stringify({
              reason: 'Admin user - requires manual review',
              violationCount,
            }),
            userId: userId,
          },
        });
        return;
      }

      // Suspend the user
      await this.prisma.user.update({
        where: { id: userId },
        data: { suspended: true },
      });

      // Log the escalation
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTO_SUSPEND_RATE_LIMIT',
          entity: 'User',
          entityId: userId,
          details: JSON.stringify({
            violationCount,
            reason: `Auto-suspended after ${violationCount} rate limit violations`,
          }),
          userId: userId,
        },
      });

      this.logger.warn(`User ${userId} auto-suspended after ${violationCount} rate limit violations`);

      // Clear violation count (user is now suspended, violations reset)
      await this.redis.del(`violations:${userId}`);
    } catch (error) {
      this.logger.error(`Error escalating to block for user ${userId}:`, error);
    }
  }

  /**
   * Reset rate limit counters for a user (admin function)
   */
  async resetRateLimit(userId: string): Promise<void> {
    try {
      await Promise.all([
        this.redis.del(`rate:minute:${userId}`),
        this.redis.del(`rate:hour:${userId}`),
        this.redis.del(`mute:${userId}`),
        this.redis.del(`violations:${userId}`),
      ]);
      this.logger.log(`Rate limit reset for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get current rate limit status for a user (admin function)
   */
  async getRateLimitStatus(userId: string): Promise<{
    isMuted: boolean;
    muteExpiresAt?: string;
    violationCount: number;
    minuteCount: number;
    hourCount: number;
  }> {
    try {
      const muteKey = `mute:${userId}`;
      const muteData = await this.redis.get(muteKey);
      const muteInfo = muteData ? JSON.parse(muteData) : null;

      const minuteCount = parseInt(await this.redis.get(`rate:minute:${userId}`) || '0', 10);
      const hourCount = parseInt(await this.redis.get(`rate:hour:${userId}`) || '0', 10);
      const violationCount = parseInt(await this.redis.get(`violations:${userId}`) || '0', 10);

      return {
        isMuted: !!muteInfo,
        muteExpiresAt: muteInfo?.expiresAt,
        violationCount,
        minuteCount,
        hourCount,
      };
    } catch (error) {
      this.logger.error(`Error getting rate limit status for user ${userId}:`, error);
      throw error;
    }
  }
}
