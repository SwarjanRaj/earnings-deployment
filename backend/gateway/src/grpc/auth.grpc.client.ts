import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc, Client, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

interface AuthService {
  signup(data: { email: string; username: string; password: string; confirmPassword: string; dob: string }): any;
  login(data: { email: string; password: string }): any;
  refresh(data: { refreshToken: string }): any;
  verify(data: { email: string; code: string }): any;
  forgot(data: { email: string }): any;
  reset(data: { email: string; code: string; newPassword: string; confirmPassword: string }): any;
  getUser(data: { userId: string }): any;
}

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: join(__dirname, '../../proto/auth.proto'),
      url: (process.env.AUTH_GRPC_URL || `${process.env.AUTHSERVICE_HOST || 'localhost'}:${process.env.AUTH_GRPC_PORT || '50051'}`).trim(),
    },
  })
  private client: ClientGrpc;

  private authService: AuthService;

  onModuleInit() {
    this.authService = this.client.getService<AuthService>('AuthService');
  }

  async signup(data: { email: string; username: string; password: string; confirmPassword: string; dob: string }) {
    return firstValueFrom(this.authService.signup(data));
  }

  async login(data: { email: string; password: string }) {
    return firstValueFrom(this.authService.login(data));
  }

  async refresh(data: { refreshToken: string }) {
    return firstValueFrom(this.authService.refresh(data));
  }

  async verify(data: { email: string; code: string }) {
    return firstValueFrom(this.authService.verify(data));
  }

  async forgot(data: { email: string }) {
    return firstValueFrom(this.authService.forgot(data));
  }

  async reset(data: { email: string; code: string; newPassword: string; confirmPassword: string }) {
    return firstValueFrom(this.authService.reset(data));
  }

  async getUser(data: { userId: string }) {
    return firstValueFrom(this.authService.getUser(data));
  }
} 