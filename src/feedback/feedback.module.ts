import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [PrismaModule, CommonModule ,  NotificationsModule , CacheModule.register()],
  providers: [FeedbackService],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
