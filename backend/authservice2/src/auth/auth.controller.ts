// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { AuthGuard } from '@nestjs/passport';

import { AuthService }       from './auth.service';
import { SignupDto }         from './dtos/signup.dto';
import { SigninDto }         from './dtos/signin.dto';
import { VerifyCodeDto }     from './dtos/verify.dto';
import { ForgotPasswordDto } from './dtos/forgot.dto';
import { ResetPasswordDto }  from './dtos/reset.dto';

const ACCESS_TTL  = 15 * 60 * 1000;           // 15 minutes
const REFRESH_TTL = 7  * 24 * 60 * 60 * 1000; // 7 days
const isProd      = process.env.NODE_ENV === 'production';
const isDev       = process.env.NODE_ENV !== 'production';
const sameSite    = 'lax';  // Use 'lax' for development to work with HTTP
const secure      = false; // Always false for development, even if isDev is false

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'auth-service' };
  }

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('verify')
  @HttpCode(200)
  async verify(
    @Body() dto: VerifyCodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyCode(dto);
    this.setCookies(res, result.accessToken, result.refreshId, result.csrf);
    return result;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: SigninDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.signin(dto);
    this.setCookies(res, result.accessToken, result.refreshId, result.csrf);
    return result;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('Incoming cookies:', req.cookies);
    const incoming = req.cookies?.refresh;
    console.log('Refresh cookie value:', incoming);
    if (!incoming) throw new UnauthorizedException('Missing refresh cookie');
    const result = await this.auth.refresh(incoming);
    this.setCookies(res, result.accessToken, result.refreshId, result.csrf);
    return result;
  }

  @Post('forgot')
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset')
  @HttpCode(200)
  async reset(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.resetPassword(dto);
    this.setCookies(res, result.accessToken, result.refreshId, result.csrf);
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear all authentication cookies
    res
      .clearCookie('access', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        domain: undefined,
      })
      .clearCookie('refresh', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        domain: undefined,
      })
      .clearCookie('csrf_refresh', {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        domain: undefined,
      });
    
    return { message: 'Logged out successfully' };
  }

  @Get('oauth/google')
  googleAuth(@Req() req: Request) {
    const state = crypto.randomBytes(16).toString('hex');
    (req as any)._state = state;
    
    // Return the full OAuth URL as a JSON object
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/oauth/google/callback';
    const scope = 'profile email';
    
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}`;
    
    return { url: oauthUrl };
  }

  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    // (Optional) verify `state` here
    const user = req.user as Awaited<
      ReturnType<AuthService['googleOauthValidate']>
    >;

    const { accessToken, refreshId, refreshExpires, csrf } =
      await this.auth.generateTokens(user);

    this.setCookies(res, accessToken, refreshId, csrf);

    // Redirect to dashboard after successful OAuth login
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/dashboard?oauth=success`);
  }

  private setCookies(
    res: Response,
    access: string,
    refresh: string,
    csrf: string,
  ) {
    // For local development with HTTP, use secure: false and sameSite: 'lax'
    const isDev = process.env.NODE_ENV !== 'production';
    res
      .cookie('access', access, {
        httpOnly: true,
        maxAge: ACCESS_TTL,
        secure: false, // Allow HTTP for local development
        sameSite: 'lax', // Allow cross-site cookies for local development
        domain: undefined, // maximize compatibility
      })
      .cookie('refresh', refresh, {
        httpOnly: true,
        maxAge: REFRESH_TTL,
        secure: false, // Allow HTTP for local development
        sameSite: 'lax', // Allow cross-site cookies for local development
        domain: undefined, // maximize compatibility
      })
      .cookie('csrf_refresh', csrf, {
        httpOnly: false,
        maxAge: REFRESH_TTL,
        secure: false, // Allow HTTP for local development
        sameSite: 'lax', // Allow cross-site cookies for local development
        domain: undefined, // maximize compatibility
      });
    // Debug log
    console.log('Set-Cookie headers after setCookies:', res.getHeaders()['set-cookie']);
  }
}