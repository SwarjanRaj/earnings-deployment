import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGrpcController } from './admin.grpc.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { StockModule } from '../stock/stock.module';
import { AuditModule } from '../audit/audit.module';
import { ChatModule } from '../chat/chat.module';

import { AdminChatController } from '../chat/admin-chat.controller';

@Module({
  imports: [PrismaModule, ScheduleModule, HttpModule, StockModule, AuditModule, ChatModule],
  controllers: [AdminController, AdminGrpcController, AdminChatController],
  providers: [AdminService],
})
export class AdminModule { }
