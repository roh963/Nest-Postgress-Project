import * as dotenv from 'dotenv';
dotenv.config();
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

const logger = new Logger('BullMQRedisConfig');

class BullMQRedisConfig {
  private static instance: Redis;

  public static getInstance(): Redis {
    if (!BullMQRedisConfig.instance) {
      const redisUrl = process.env.REDIS_URL;
      logger.log(`REDIS_URL: ${redisUrl}`);
      if (!redisUrl) {
        logger.error('REDIS_URL is not defined in environment variables');
        throw new Error('REDIS_URL is not defined');
      }

      BullMQRedisConfig.instance = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 10000,
        maxRetriesPerRequest: null, // Required for BullMQ compatibility
        reconnectOnError: (err: any) => {
          logger.warn(`Redis reconnect attempt due to error: ${err.message}`);
          return err.message.includes('READONLY');
        },
      });

      BullMQRedisConfig.instance.on('connect', () => {
        logger.log('✅ BullMQ Redis connected successfully');
      });

      BullMQRedisConfig.instance.on('error', (error) => {
        logger.error('❌ BullMQ Redis connection error:', error);
      });
    }

    return BullMQRedisConfig.instance;
  }

  public static async disconnect(): Promise<void> {
    if (BullMQRedisConfig.instance) {
      await BullMQRedisConfig.instance.quit();
      logger.log('🔌 BullMQ Redis connection closed');
    }
  }
}

export const bullmqRedis = BullMQRedisConfig.getInstance();
