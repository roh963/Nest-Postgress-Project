import * as dotenv from 'dotenv';
dotenv.config();
import { Processor, Worker, Job, Queue } from 'bullmq'; // Add Queue import if using optional listener
import { NotificationsService } from './notifications.service';
import { bullmqRedis } from '../utils/bullmq-redis.config';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Mock ConfigService for standalone worker (loads from process.env)
const mockConfigService = new ConfigService({
  WEBHOOK_URL_SLACK: process.env.WEBHOOK_URL_SLACK,
});

const logger = new Logger('NotificationsWorker');

// Processor function using static method
const processor: Processor = async (job: Job<{ entityType: 'feedback' | 'file'; entityId: string }>) => {
  logger.log(`📥 Received job ${job.id} with data: ${JSON.stringify(job.data)}`);
  const jobData = {
    entityType: job.data.entityType,
    entityId: job.data.entityId,
  };

  return await NotificationsService.processNotificationStatic(jobData, mockConfigService);
};

// Create worker with BullMQ
const worker = new Worker('notifications', processor, {
  connection: bullmqRedis,
  concurrency: 5, // Process 5 jobs concurrently
});

// Optional: Create Queue instance to listen for 'waiting' events (if you want queue monitoring)
const notificationsQueue = new Queue('notifications', { connection: bullmqRedis });
notificationsQueue.on('waiting', (jobId) => {
  logger.log(`⏳ Job ${jobId} waiting to be processed`); // This is a valid Queue event
});

// Event listeners (only valid Worker events)
worker.on('completed', (job) => {
  logger.log(`✅ Job ${job.id} completed for ${job.data.entityType} ${job.data.entityId}`);
});

worker.on('failed', (job, error) => {
  if (job) {
    logger.error(`❌ Job ${job.id} failed for ${job.data.entityType} ${job.data.entityId}: ${error.message}`);
  } else {
    logger.error(`❌ Job failed (undefined job): ${error.message}`);
  }
});

worker.on('active', (job) => {
  logger.log(`🔄 Started processing job ${job.id} for ${job.data.entityType} ${job.data.entityId}`);
});

logger.log('👷 Notifications Worker started. Waiting for jobs...');


// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.log('🛑 Shutting down worker gracefully');
  await worker.close();
  await notificationsQueue.close(); // Close Queue if using it
  await bullmqRedis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.log('🛑 Shutting down worker gracefully');
  await worker.close();
  await notificationsQueue.close(); // Close Queue if using it
  await bullmqRedis.quit();
  process.exit(0);
});