import { Module } from '@nestjs/common';
import { PaginationUtil } from '../utils/pagination.util';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Module({
  providers: [PaginationUtil,LoggingInterceptor],
  exports: [PaginationUtil,LoggingInterceptor],
})
export class CommonModule {}
