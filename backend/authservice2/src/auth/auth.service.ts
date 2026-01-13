// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { addDays, isAfter } from 'date-fns';
import * as crypto from 'crypto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

import { UsersService } from '../users/users.service';
import { MailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

import { UserRole } from '@prisma/client';
import { SignupDto } from './dtos/signup.dto';
import { SigninDto } from './dtos/signin.dto';
import { VerifyCodeDto } from './dtos/verify.dto';
import { ForgotPasswordDto } from './dtos/forgot.dto';
import { ResetPasswordDto } from './dtos/reset.dto';

import { randomToken } from '../common/utlis/random-token';
import { isDev } from '../common/env';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

const CODE_TTL_SEC = 60 * 10;     // 10 minutes
const ACCESS_EXP_MIN = 15;        // 15 minutes
const REFRESH_EXP_DAYS =
  Number(process.env.REFRESH_EXPIRATION_DAYS ?? 7);
const FORGOT_PASSWORD_RATE_LIMIT_SEC = 60; // 1 minute between requests
const FORGOT_PASSWORD_MAX_ATTEMPTS = 3;    // Max 3 attempts per hour
const FORGOT_PASSWORD_RATE_LIMIT_WINDOW = 60 * 60; // 1 hour window

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) { }

  private async createRefreshToken(userId: string) {
    const raw = crypto.randomUUID();
    const hash = await bcrypt.hash(raw, 10);
    const exp = addDays(new Date(), REFRESH_EXP_DAYS);

    await this.prisma.refreshToken.create({
      data: { id: raw, tokenHash: hash, expiresAt: exp, userId },
    });
    return { raw, exp };
  }

  public async generateTokens(user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    isVerified: boolean;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwt.sign(payload, { expiresIn: `${ACCESS_EXP_MIN}m` });
    const { raw: refreshId, exp: refreshExpires } = await this.createRefreshToken(user.id);
    const csrf = randomToken();
    // Return tokens and user info
    const result = {
      accessToken,
      refreshId,
      refreshExpires,
      csrf,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isVerified: user.isVerified,
      },
    };

    return result;
  }

  private setCode(email: string, code: string) {
    return this.redis.setex(`verify:${email}`, CODE_TTL_SEC, code);
  }
  private async popCode(email: string): Promise<string | null> {
    const key = `verify:${email}`;
    const code = await this.redis.get(key);
    if (code) await this.redis.del(key);
    return code;
  }

  /**
   * Check rate limit for forgot password requests
   * Returns true if rate limit is exceeded
   */
  private async checkForgotPasswordRateLimit(email: string): Promise<boolean> {
    const rateLimitKey = `forgot:ratelimit:${email}`;
    const attemptsKey = `forgot:attempts:${email}`;
    
    // Check if there's a recent request (within 1 minute)
    const recentRequest = await this.redis.get(rateLimitKey);
    if (recentRequest) {
      return true; // Rate limit exceeded
    }

    // Check attempt count within the window
    const attempts = await this.redis.get(attemptsKey);
    const attemptCount = attempts ? parseInt(attempts, 10) : 0;
    
    if (attemptCount >= FORGOT_PASSWORD_MAX_ATTEMPTS) {
      return true; // Too many attempts
    }

    // Set rate limit key (1 minute cooldown)
    await this.redis.setex(rateLimitKey, FORGOT_PASSWORD_RATE_LIMIT_SEC, '1');
    
    // Increment attempt counter
    if (attemptCount === 0) {
      await this.redis.setex(attemptsKey, FORGOT_PASSWORD_RATE_LIMIT_WINDOW, '1');
    } else {
      await this.redis.incr(attemptsKey);
    }

    return false; // Rate limit not exceeded
  }

  /**
   * Generate a secure 6-digit code
   */
  private generateSixDigitCode(): string {
    // Generate a random number between 100000 and 999999 (6 digits)
    return (Math.floor(100_000 + Math.random() * 900_000)).toString();
  }

  async signup(dto: SignupDto) {
    if (await this.users.findByEmail(dto.email))
      throw new BadRequestException('Email already in use');

    const hash = await bcrypt.hash(dto.password, 12);

    // ─── Create the user ─────────────────────────────────────────────────────────
    const username = dto.email.split('@')[0];
    await this.users.create(
      dto.email,          // email
      username,           // username (required)
      hash,               // passwordHash
      UserRole.USER,      // role
      undefined,          // firstName
      undefined,          // lastName
      undefined,          // dob
      false,              // isVerified
    );

    /* create 6-digit code */
    const code = this.generateSixDigitCode();
    await this.setCode(dto.email, code);

    // Try to send email, but return dev code if it fails
    try {
      await this.mail.sendVerificationEmail(dto.email, code);
      return { message: 'Signup successful — check your email for verification code' };
    } catch (error) {
      return { 
        message: 'Signup successful — check your email for verification code',
        devCode: code 
      };
    }
  }

  async verifyCode(dto: VerifyCodeDto) {
    const stored = await this.popCode(dto.email);
    if (!stored || stored !== dto.code)
      throw new BadRequestException('Invalid or expired code');

    const user = await this.users.findByEmail(dto.email, true);
    if (!user) throw new NotFoundException('User not found');

    await this.users.markVerified(user.id);
    // Remove passwordHash before returning
    const { passwordHash, ...publicUser } = user;
    return this.generateTokens(publicUser);
  }

  async signin(dto: SigninDto) {
    const user = await this.users.findByEmail(dto.email, true);
    if (!user?.passwordHash)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.isVerified)
      throw new ForbiddenException('Please verify your email first');

    // Remove passwordHash before returning
    const { passwordHash, ...publicUser } = user;
    return this.generateTokens(publicUser);
  }

  async refresh(refreshId: string) {
    const row = await this.prisma.refreshToken.findUnique({
      where: { id: refreshId },
      include: { user: true },
    });
    if (!row) throw new UnauthorizedException('Invalid refresh token');
    if (isAfter(new Date(), row.expiresAt))
      throw new UnauthorizedException('Refresh token expired');

    try {
      await this.prisma.refreshToken.delete({ where: { id: refreshId } });
    } catch (e) {
      // If already deleted, treat as invalid/expired
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.generateTokens(row.user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Check rate limiting first
    const rateLimitExceeded = await this.checkForgotPasswordRateLimit(dto.email);
    if (rateLimitExceeded) {
      throw new BadRequestException(
        'Too many password reset requests. Please wait before trying again.'
      );
    }

    // Check if user exists in database
    const user = await this.users.findByEmail(dto.email);
    
    // Only proceed if user exists and is verified
    if (!user) {
      // Return same message for security (don't reveal if email exists)
      return { message: 'If registered, a reset code has been emailed' };
    }

    if (!user.isVerified) {
      throw new ForbiddenException(
        'Please verify your email address before resetting your password.'
      );
    }

    // Generate secure 6-digit code
    const code = this.generateSixDigitCode();
    
    // Store code in Redis with expiration
    await this.setCode(dto.email, code);
    
    // Send email with reset code
    try {
      await this.mail.sendPasswordResetEmail(dto.email, code);
      return { message: 'If registered, a reset code has been emailed' };
    } catch (error) {
      // If email sending fails, still return success message for security
      // But include dev code in development mode
      if (isDev) {
        return { 
          message: 'If registered, a reset code has been emailed',
          devCode: code 
        };
      }
      return { message: 'If registered, a reset code has been emailed' };
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Validate that code is exactly 6 digits (DTO already validates, but double-check)
    if (!/^\d{6}$/.test(dto.code)) {
      throw new BadRequestException('Reset code must be exactly 6 digits');
    }

    // Check if user exists
    const user = await this.users.findByEmail(dto.email, true);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify user is verified
    if (!user.isVerified) {
      throw new ForbiddenException('Please verify your email address first');
    }

    // Get and validate the reset code (this also removes it from Redis - single use)
    const stored = await this.popCode(dto.email);
    if (!stored) {
      throw new BadRequestException('Reset code has expired or already been used');
    }

    if (stored !== dto.code) {
      throw new BadRequestException('Invalid reset code');
    }

    // Hash the new password
    const hash = await bcrypt.hash(dto.newPassword, 12);
    
    // Update password in database
    await this.users.updatePasswordByEmail(dto.email, hash);

    // Clear any rate limiting for this email (successful reset)
    await this.redis.del(`forgot:ratelimit:${dto.email}`);
    await this.redis.del(`forgot:attempts:${dto.email}`);

    // Remove passwordHash before returning
    const { passwordHash, ...publicUser } = user;
    return this.generateTokens(publicUser);
  }

  async googleOauthValidate(profile: import('passport-google-oauth20').Profile) {
    const email     = profile.emails?.[0]?.value!;
    const firstName = profile.name?.givenName ?? undefined;
    const lastName  = profile.name?.familyName  ?? undefined;

    const allowed = process.env.GOOGLE_ALLOWED_DOMAIN;
    if (allowed && !email.endsWith(`@${allowed}`)) {
      throw new UnauthorizedException('Google account not in allowed domain');
    }

    let user = await this.users.findByEmail(email);
    if (!user) {
      const username = email.split('@')[0];
      user = await this.users.create(
        email,
        username,        // username
        null,            // passwordHash
        UserRole.USER,   // role
        firstName,       // firstName
        lastName,        // lastName
        undefined,       // dob
        true,            // isVerified
      );
    }

    return user;
  }
}
