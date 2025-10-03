import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { ConfigModule } from '@nestjs/config';
import { bullmqRedis } from '../utils/bullmq-redis.config'; // Your BullMQ Redis

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'notifications',
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 3, // Retry 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Exponential backoff: 2s, 4s, 8s
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}