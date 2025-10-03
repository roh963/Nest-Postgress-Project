import {
  Injectable,
  UnauthorizedException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    try {
      const user = await this.prisma.$transaction(async (prisma) => {
        const user = await prisma.user.create({
          data: {
            email: registerDto.email.toLowerCase(),
            passwordHash: hashedPassword,
            role: registerDto.role || 'user',
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'USER_CREATED',
            details: `User registered with email: ${user.email}`,
          },
        });
        const { passwordHash, refreshToken, ...safeUser } = user;
        return safeUser;
      });
      return { message: 'User registered', user };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithSensitiveData(
      loginDto.email,
    );
    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(loginDto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return await this.prisma.$transaction(async (prisma) => {
      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: `${this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS')}d`,
      });

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await this.usersService.update(user.id, {
        refreshToken: hashedRefreshToken,
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          details: `User logged in with email: ${user.email}`,
        },
      });

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken,
      };
    });
  }

  async refresh(refreshToken: string) {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    if (!refreshSecret) {
      console.error('JWT_REFRESH_SECRET is not set!');
      throw new UnauthorizedException('Refresh secret not configured');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });
      const user = await this.usersService.findByEmailWithSensitiveData(
        payload.email,
      );
      if (
        !user ||
        !user.refreshToken ||
        !(await bcrypt.compare(refreshToken, user.refreshToken))
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return await this.prisma.$transaction(async (prisma) => {
        const newPayload = { sub: user.id, email: user.email, role: user.role };
        const newAccessToken = this.jwtService.sign(newPayload);
        const newRefreshToken = this.jwtService.sign(newPayload, {
          secret: refreshSecret,
          expiresIn: `${this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS')}d`,
        });

        const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
        await this.usersService.update(user.id, {
          refreshToken: hashedNewRefreshToken,
        });

        await this.cacheManager.set(
          `blacklist:${refreshToken}`,
          'true',
          7 * 24 * 60 * 60 * 1000,
        );
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'TOKEN_REFRESHED',
            details: `User refreshed token: ${user.email}`,
          },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        };
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number, refreshToken: string) {
    await this.prisma.$transaction(async (prisma) => {
      await this.usersService.update(userId, { refreshToken: null });
      await this.cacheManager.set(
        `blacklist:${refreshToken}`,
        'true',
        7 * 24 * 60 * 60 * 1000,
      );
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'USER_LOGOUT',
          details: `User logged out: ${userId}`,
        },
      });
    });
  }

  async validateUser(userId: number) {
    return this.usersService.findById(userId);
  }

  // async handleOAuthLogin(
  //   data: {
  //     provider: string;
  //     providerUserId: string;
  //     email: string;
  //     accessToken: string;
  //     refreshToken?: string;
  //   },
  //   existingUser?: { id: number; email: string; role: string },
  // ) {
  //   try {
  //     return await this.prisma.$transaction(async (prisma) => {
  //       let user:any = existingUser;
  //       const provider = await prisma.userProvider.findUnique({
  //         where: { provider_providerUserId: { provider: data.provider, providerUserId: data.providerUserId } },
  //       });

  //       if (provider) {
  //         if (!user) {
  //           user = await prisma.user.findUnique({ where: { id: provider.userId } });
  //         }
  //         if (user) {
  //           await prisma.auditLog.create({
  //             data: {
  //               userId: user.id,
  //               action: 'OAUTH_LOGIN',
  //               details: `User logged in with ${data.provider}: ${user.email}`,
  //             },
  //           });
  //           return user;
  //         }
  //       }

  //       if (user) {
  //         await prisma.userProvider.create({
  //           data: {
  //             userId: user.id,
  //             provider: data.provider,
  //             providerUserId: data.providerUserId,
  //             accessToken: data.accessToken,
  //             refreshToken: data.refreshToken,
  //           },
  //         });
  //         await prisma.auditLog.create({
  //           data: {
  //             userId: user.id,
  //             action: 'OAUTH_PROVIDER_LINKED',
  //             details: `Linked ${data.provider} provider for user: ${user.email}`,
  //           },
  //         });
  //         return user;
  //       }

  //        user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  //       if (!user) {
  //         user = await prisma.user.create({
  //           data: {
  //             email: data.email.toLowerCase(),
  //             role: 'user',
  //           },
  //         });
  //       }

  //       await prisma.userProvider.create({
  //         data: {
  //           userId: user.id,
  //           provider: data.provider,
  //           providerUserId: data.providerUserId,
  //           accessToken: data.accessToken,
  //           refreshToken: data.refreshToken,
  //         },
  //       });

  //       await prisma.auditLog.create({
  //         data: {
  //           userId: user.id,
  //           action: 'OAUTH_PROVIDER_LINKED',
  //           details: `Linked ${data.provider} provider for user: ${user.email}`,
  //         },
  //       });

  //       return user;
  //     });
  //   } catch (error) {
  //     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
  //       throw new ConflictException(`${data.provider} account already linked to another user`);
  //     }
  //     throw error;
  //   }
  // }

  async handleOAuthLogin(
    data: {
      provider: string;
      providerUserId: string;
      email: string;
      accessToken: string;
      refreshToken?: string;
    },
    existingUser?: { id: number; email: string; role: string },
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        let user: any = existingUser;

        // Check if provider is already linked
        const provider = await prisma.userProvider.findUnique({
          where: {
            provider_providerUserId: {
              provider: data.provider,
              providerUserId: data.providerUserId,
            },
          },
        });

        if (provider && !user) {
          // Duplicate provider detected → throw exception
          throw new ConflictException(
            `${data.provider} account already linked to another user`,
          );
        }

        if (!user && provider) {
          user = await prisma.user.findUnique({
            where: { id: provider.userId },
          });
        }

        if (!user) {
          user = await prisma.user.findUnique({
            where: { email: data.email.toLowerCase() },
          });
        }

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: data.email.toLowerCase(),
              role: 'user',
            },
          });
        }

        await prisma.userProvider.create({
          data: {
            userId: user.id,
            provider: data.provider,
            providerUserId: data.providerUserId,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'OAUTH_PROVIDER_LINKED',
            details: `Linked ${data.provider} provider for user: ${user.email}`,
          },
        });

        return user;
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `${data.provider} account already linked to another user`,
        );
      }
      throw error;
    }
  }

  async createSession(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS')}d`,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    return { accessToken, refreshToken };
  }
}
