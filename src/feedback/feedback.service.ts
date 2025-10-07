import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { PaginationUtil, PaginationResult } from '../utils/pagination.util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class FeedbackService {
  constructor(
    private prisma: PrismaService,
    private paginationUtil: PaginationUtil,
    private readonly notificationsService: NotificationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createFeedbackDto: CreateFeedbackDto) {
    const result = await this.prisma.feedback.create({
      data: createFeedbackDto,
    });
    await this.notificationsService.enqueueNotification(
      'feedback',
      result.id.toString(),
    );
    await this.cacheManager.del('feedback:list:*');
    return result;
  }

  async list(page: number, limit: number): Promise<PaginationResult<any>> {
    const cacheKey = `feedback:list:page=${page}&limit=${limit}`;
    const cached = await this.cacheManager.get<PaginationResult<any>>(cacheKey);
    if (cached) return cached;

    const result = await this.paginationUtil.paginate(
      (skip, take) => this.prisma.feedback.findMany({ skip, take }),
      () => this.prisma.feedback.count(),
      page,
      limit,
    );

    await this.cacheManager.set(cacheKey, result, 60 * 1000);
    return result;
  }

  async delete(id: number) {
    const result = await this.prisma.feedback.delete({ where: { id } });
    await this.cacheManager.del('feedback:list:*');
    return result;
  }
}
