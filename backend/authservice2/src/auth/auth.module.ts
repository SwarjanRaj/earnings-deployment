// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthController } from './auth.controller';
import { AuthGrpcController } from './auth.grpc.controller';
import { AuthService }    from './auth.service';
import { UsersModule }  from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule }   from '../email/email.module';
import { JwtStrategy }     from './strategies/jwt.strategy';
import { GoogleStrategy }  from './strategies/google.strategy';
import { JwtAuthGuard }    from './guards/jwt-auth.guard';
import { RolesGuard }      from './guards/roles.guard';

@Module({
  imports: [
    /* .env → ConfigService */
    ConfigModule.forRoot({ isGlobal: true }),

    /* passport-jwt */
    PassportModule,

    /* JWT configured from env */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject : [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRATION') || '15m' },
      }),
    }),

    /* Redis for verification codes */
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'single',
        options: {
          host: cfg.get<string>('REDIS_HOST')   || 'localhost',
          port: Number(cfg.get<number>('REDIS_PORT')) || 6379,
          username: cfg.get<string>('REDIS_USER') || undefined,
          password: cfg.get<string>('REDIS_PASS') || undefined,
        },
      }),
    }),

    /* feature modules */
    UsersModule,
    PrismaModule,
    MailModule,
  ],

  controllers: [AuthController, AuthGrpcController],

  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: GoogleStrategy,
      useFactory: (configService: ConfigService, authService: AuthService) => {
        const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
        const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

        if (!clientID || !clientSecret || !callbackURL) {
          return null;
        }

        return new GoogleStrategy(configService, authService);
      },
      inject: [ConfigService, AuthService],
    },
    JwtAuthGuard,
    RolesGuard,
  ].filter(Boolean),

  /* export guards so other modules can @UseGuards(JwtAuthGuard) */
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
