import { IsEmail, IsString, MinLength, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Great service!' })
  @IsString()
  @MinLength(10)
  message: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  userId?: number;
}