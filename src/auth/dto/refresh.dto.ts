import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ example: 'your-refresh-token' })
  @IsString()
  refreshToken: string;
}