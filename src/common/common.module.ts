import { Module } from '@nestjs/common';
import { PaginationUtil } from '../utils/pagination.util';

@Module({
  providers: [PaginationUtil],
  exports: [PaginationUtil],
})
export class CommonModule {}