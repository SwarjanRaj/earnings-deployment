// src/redis/redis.module.ts

import { Module, Global } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';

@Global()
@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? 6379}`,
      // If you need to add a password:
      // options: { password: process.env.REDIS_PASSWORD },
    }),
  ],
  exports: [RedisModule],
})
export class AppRedisModule {}
