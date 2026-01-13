// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule }  from './users/users.module';
import { AuthModule }   from './auth/auth.module';
import { AppRedisModule } from './redis/redis.module';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard   } from './auth/guards/roles.guard';

@Module({
  imports: [
    /* ─ Global config (.env) ─ */
    ConfigModule.forRoot({ isGlobal: true }),

    /* ─ Internal feature modules ─ */
    PrismaModule,
    UsersModule,
    AuthModule,
    AppRedisModule,
  ],

  /*  🔐  Global guards run on every incoming request
   *  – JwtAuthGuard puts `req.user` on the request (or 401s)
   *  – RolesGuard checks @Roles() metadata (or 403s)
   *  Comment either out if you prefer per-route guards instead.               */
  providers: [
 //  { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
