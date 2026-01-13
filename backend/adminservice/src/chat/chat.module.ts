import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AdminChatService } from './admin-chat.service';
import { ChatController } from './chat.controller';
// import { AdminChatController } from './admin-chat.controller'; // Moved to AdminModule

import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AppRedisModule } from '../redis/redis.module';
import { RateLimitService } from './rate-limit.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, CommonModule, AppRedisModule, AuditModule],
  controllers: [ChatController], // AdminChatController is in AdminModule, SimpleController here
  providers: [ChatService, AdminChatService, ChatGateway, RateLimitService],
  exports: [ChatService, RateLimitService, AdminChatService],
})
export class ChatModule { }
