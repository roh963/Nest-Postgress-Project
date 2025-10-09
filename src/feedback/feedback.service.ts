import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { PaginationUtil, PaginationResult } from '../utils/pagination.util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { NotificationsService } from 'src/notifications/notifications.service';
import * as crypto from 'crypto';

@Injectable()
export class FeedbackService {
  private logger = new Logger(FeedbackService.name);

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
    await this.notificationsService.enqueueNotification('feedback', result.id.toString());
    await this.cacheManager.del('feedback:list:*');
    return result;
  }

 async list(page: number, limit: number, filters: any = {}): Promise<PaginationResult<any>> {
    const filterHash = crypto.createHash('md5').update(JSON.stringify(filters)).digest('hex');
    const cacheKey = `feedback:list:v1:page=${page}:limit=${limit}:q=${filterHash}`;
    const cached = await this.cacheManager.get<PaginationResult<any>>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }
    this.logger.debug(`Cache miss for ${cacheKey}`);

    const result = await this.paginationUtil.paginate(
      (skip, take) =>
        this.prisma.feedback.findMany({
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            message: true,
            createdAt: true,
            user: {
              select: { id: true, email: true, role: true },
            },
          },
          where: filters,
        }),
      () => this.prisma.feedback.count({ where: filters }),
      page,
      limit,
    );

    await this.cacheManager.set(cacheKey, result, 60 * 1000);
    this.logger.debug(`Cache set for ${cacheKey} with TTL 60s`);
    return result;
  }

  async getById(id: number) {
    const cacheKey = `feedback:byId:v1:${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }
    this.logger.debug(`Cache miss for ${cacheKey}`);
    const result = await this.prisma.feedback.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        message: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });
    if (result) await this.cacheManager.set(cacheKey, result, 300 * 1000);
    return result;
  }

  async update(id: number, updateFeedbackDto: Partial<CreateFeedbackDto>) {
    const result = await this.prisma.feedback.update({
      where: { id },
      data: updateFeedbackDto,
    });
    await this.cacheManager.del('feedback:list:*');
    await this.cacheManager.del(`feedback:byId:v1:${id}`);
    return result;
  }

  async delete(id: number) {
    const result = await this.prisma.feedback.delete({ where: { id } });
    await this.cacheManager.del('feedback:list:*');
    await this.cacheManager.del(`feedback:byId:v1:${id}`);
    return result;
  }

  async analyzeFeedbackListQuery(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const query = `EXPLAIN ANALYZE SELECT * FROM "Feedback" ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${skip}`;
    const result = await this.prisma.$queryRawUnsafe(query);
    console.log(result);
    return result;
  }

  async analyzeFeedbackSearchQuery(email: string = 'test0@example.com') {
    const query = `EXPLAIN ANALYZE SELECT * FROM "Feedback" WHERE "email" = '${email}' LIMIT 10`;
    const result = await this.prisma.$queryRawUnsafe(query);
    console.log(result);
    return result;
  }
}