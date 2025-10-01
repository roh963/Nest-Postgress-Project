import { Injectable } from '@nestjs/common';

export interface PaginationResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

@Injectable()
export class PaginationUtil {
  getPaginationParams(
    page: number,
    limit: number,
  ): { page: number; limit: number } {
    const parsedPage = Math.max(1, page || 1);
    const parsedLimit = Math.min(Math.max(1, limit || 10), 100); // Max limit 100
    return { page: parsedPage, limit: parsedLimit };
  }

  async paginate<T>(
    findMany: (skip: number, take: number) => Promise<T[]>,
    count: () => Promise<number>,
    page: number,
    limit: number,
  ): Promise<PaginationResult<T>> {
    const { page: parsedPage, limit: parsedLimit } = this.getPaginationParams(
      page,
      limit,
    );
    const skip = (parsedPage - 1) * parsedLimit;
    const [data, total] = await Promise.all([
      findMany(skip, parsedLimit),
      count(),
    ]);
    return {
      data,
      meta: { page: parsedPage, limit: parsedLimit, total },
    };
  }
}
