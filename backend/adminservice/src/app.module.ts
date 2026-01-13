import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AdminModule } from './admin/admin.module';
import { StockModule } from './stock/stock.module';
import { ChatModule } from './chat/chat.module';
import { AppRedisModule } from './redis/redis.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    CommonModule,
    AdminModule,
    StockModule,
    ChatModule,
    AppRedisModule,
    ScheduleModule.forRoot(),
    HttpModule,
  ],
})
export class AppModule {}
