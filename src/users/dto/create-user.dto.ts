import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'hashedpassword' })
  @IsString()
  passwordHash: string;

  @ApiProperty({ example: 'user', required: false })
  @IsString()
  role?: string;
}
