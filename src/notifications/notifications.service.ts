import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async enqueueNotification(
    entityType: 'feedback' | 'file',
    entityId: string,
  ): Promise<void> {
    if (!entityType || !entityId) {
      this.logger.error(
        `Invalid job data: entityType=${entityType}, entityId=${entityId}`,
      );
      throw new Error('Invalid job data: entityType and entityId are required');
    }
    const job = await this.notificationsQueue.add('notify', {
      entityType,
      entityId,
    });
    this.logger.log(
      `📤 Enqueued notification job ${job.id} for ${entityType} ${entityId}`,
    );
  }

  static async processNotificationStatic(
    data: { entityType: 'feedback' | 'file'; entityId: string },
    configService: ConfigService,
  ): Promise<string> {
    const logger = new Logger('NotificationsService-Worker');
    logger.log(
      `🚀 Processing notification for ${data.entityType} ${data.entityId}`,
    );

    // Validate job data
    if (!data?.entityType || !data?.entityId) {
      const errorMessage = `Invalid job data: entityType=${data?.entityType}, entityId=${data?.entityId}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const webhookUrl = configService.get<string>('WEBHOOK_URL_SLACK'); // rename later to WEBHOOK_URL_DISCORD if you want
    if (!webhookUrl) {
      logger.error('WEBHOOK_URL_SLACK is not defined');
      throw new Error('WEBHOOK_URL_SLACK is not defined');
    }

    const message = `New ${data.entityType} created with ID: ${data.entityId}`;
    const payload = {
      content: message || 'Default notification: A new item was created', // Discord requires 'content'
    };

    try {
      logger.debug(`Sending Discord payload: ${JSON.stringify(payload)}`);
      const response = await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      logger.log(
        `✅ Sent Discord webhook for ${data.entityType} ${data.entityId}: ${response.status}`,
      );
      return `notify: ${data.entityId}`;
    } catch (error: any) {
      const errorMessage = error.response
        ? `Request failed with status code ${error.response.status}: ${JSON.stringify(error.response.data)}`
        : error.message;
      logger.error(
        `❌ Failed to send Discord webhook for ${data.entityType} ${data.entityId}: ${errorMessage}`,
      );
      throw new Error(errorMessage);
    }
  }
}
