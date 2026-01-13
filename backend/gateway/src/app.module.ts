// gateway/src/app.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';

import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { AuthGrpcClient } from './grpc/auth.grpc.client';
import { AdminGrpcClient } from './grpc/admin.grpc.client';

@Module({
  imports: [
    HttpModule,
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [GatewayController],
  providers: [GatewayService, AuthGrpcClient, AdminGrpcClient],
})
export class AppModule {}
