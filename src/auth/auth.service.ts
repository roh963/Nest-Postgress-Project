import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      role: registerDto.role || 'user',
    });
    return { message: 'User registered'  ,user:user};
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithSensitiveData(loginDto.email);
    if (!user || !(await bcrypt.compare(loginDto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS')}d`,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(user.id, { refreshToken: hashedRefreshToken });

    return {id:user.id,email:user.email,role:user.role, accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
  const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

  if (!refreshToken) {
    throw new UnauthorizedException('No refresh token provided');
  }

  if (!refreshSecret) {
    console.error('JWT_REFRESH_SECRET is not set!'); // explicit error
    throw new UnauthorizedException('Refresh secret not configured');
  }
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    
      const user = await this.usersService.findByEmailWithSensitiveData(payload.email);
      if (!user || !user.refreshToken || !(await bcrypt.compare(refreshToken, user.refreshToken))) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { sub: user.id, email: user.email, role: user.role };
      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: `${this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS')}d`,
      });

      const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      await this.usersService.update(user.id, { refreshToken: hashedNewRefreshToken });

      await this.cacheManager.set(`blacklist:${refreshToken}`, 'true', 7 * 24 * 60 * 60 * 1000);
      return {user:user.id,email:user.email,role:user.role, accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number, refreshToken: string) {
    await this.usersService.update(userId, { refreshToken: null });
    await this.cacheManager.set(`blacklist:${refreshToken}`, 'true', 7 * 24 * 60 * 60 * 1000);
      
  }

  async validateUser(userId: number) {
    return this.usersService.findById(userId);
  }
}