import { SetMetadata } from '@nestjs/common';

export const Deprecated = () => SetMetadata('deprecated', true);