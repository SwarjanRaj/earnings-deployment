import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

@Controller()
export class AuthGrpcController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @GrpcMethod('AuthService', 'Signup')
  async signup(data: { email: string; username: string; password: string; confirmPassword: string; dob: string }) {
    try {
      const result = await this.authService.signup(data);
      return {
        message: result.message,
        devCode: result.devCode,
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        devCode: '',
        success: false,
      };
    }
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: { email: string; password: string }) {
    try {
      const result = await this.authService.signin(data);
      return {
        message: 'Login successful',
        accessToken: result.accessToken,
        refreshId: result.refreshId,
        refreshExpires: result.refreshExpires,
        csrf: result.csrf,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          role: result.user.role,
          isVerified: result.user.isVerified,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        accessToken: '',
        refreshId: '',
        refreshExpires: '',
        csrf: '',
        user: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AuthService', 'Refresh')
  async refresh(data: { refreshToken: string }) {
    try {
      const result = await this.authService.refresh(data.refreshToken);
      return {
        accessToken: result.accessToken,
        refreshId: result.refreshId,
        refreshExpires: result.refreshExpires,
        csrf: result.csrf,
        success: true,
      };
    } catch (error) {
      return {
        accessToken: '',
        refreshId: '',
        refreshExpires: '',
        csrf: '',
        success: false,
      };
    }
  }

  @GrpcMethod('AuthService', 'Verify')
  async verify(data: { email: string; code: string }) {
    try {
      const result = await this.authService.verifyCode(data);
      return {
        message: 'Verification successful',
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        success: false,
      };
    }
  }

  @GrpcMethod('AuthService', 'Forgot')
  async forgot(data: { email: string }) {
    try {
      const result = await this.authService.forgotPassword({ email: data.email });
      return {
        message: result.message,
        devCode: result.devCode,
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        devCode: '',
        success: false,
      };
    }
  }

  @GrpcMethod('AuthService', 'Reset')
  async reset(data: { email: string; code: string; newPassword: string; confirmPassword: string }) {
    try {
      const result = await this.authService.resetPassword({
        email: data.email,
        code: data.code,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      return {
        message: 'Password reset successful',
        accessToken: result.accessToken,
        refreshId: result.refreshId,
        refreshExpires: result.refreshExpires,
        csrf: result.csrf,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          role: result.user.role,
          isVerified: result.user.isVerified,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        success: true,
      };
    } catch (error) {
      return {
        message: error.message || 'Password reset failed',
        accessToken: '',
        refreshId: '',
        refreshExpires: '',
        csrf: '',
        user: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AuthService', 'GetUser')
  async getUser(data: { userId: string }) {
    try {
      const user = await this.usersService.findById(data.userId);
      if (!user) {
        return {
          user: null,
          success: false,
        };
      }
      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        success: true,
      };
    } catch (error) {
      return {
        user: null,
        success: false,
      };
    }
  }
} 