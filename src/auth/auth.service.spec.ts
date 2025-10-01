import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('AuthService handleOAuthLogin', () => {
  let service: AuthService;
  let prismaService: any;
  let usersService: any;
  let jwtService: any;
  let configService: any;
  let cacheManager: any;

  beforeEach(async () => {
    const baseMockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      userProvider: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const mockTransaction = jest.fn().mockImplementation(async (fn) => {
      return await fn(baseMockPrisma);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmailWithSensitiveData: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn().mockReturnValue({ email: 'test@example.com' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'JWT_SECRET':
                  return 'jwt-secret';
                case 'JWT_REFRESH_SECRET':
                  return 'jwt-refresh-secret';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: mockTransaction,
            user: baseMockPrisma.user,
            userProvider: baseMockPrisma.userProvider,
            auditLog: baseMockPrisma.auditLog,
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('handleOAuthLogin', () => {
    it('should create new user and provider if none exist', async () => {
      const oauthData = {
        provider: 'google',
        providerUserId: '123',
        email: 'test@example.com',
        accessToken: 'access',
        refreshToken: 'refresh',
      };

      const mockUser = {
        id: 1,
        email: oauthData.email,
        role: 'user',
        passwordHash: null,
        refreshToken: null,
        createdAt: new Date(),
      };

      prismaService.$transaction.mockImplementation(async (fn) => {
        const mockPrisma = {
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockUser),
          },
          userProvider: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 10 }),
          },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return await fn(mockPrisma);
      });

      const result = await service.handleOAuthLogin(oauthData);
      expect(result).toEqual(mockUser);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should link provider to existing user', async () => {
      const oauthData = {
        provider: 'google',
        providerUserId: '123',
        email: 'test@example.com',
        accessToken: 'access',
        refreshToken: 'refresh',
      };

      const mockUser = {
        id: 1,
        email: oauthData.email,
        role: 'user',
        passwordHash: null,
        refreshToken: null,
        createdAt: new Date(),
      };

      prismaService.$transaction.mockImplementation(async (fn) => {
        const mockPrisma = {
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            create: jest.fn(),
          },
          userProvider: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 20 }),
          },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return await fn(mockPrisma);
      });

      const result = await service.handleOAuthLogin(oauthData, mockUser);
      expect(result).toEqual(mockUser);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate provider', async () => {
      const oauthData = {
        provider: 'google',
        providerUserId: '123',
        email: 'test@example.com',
        accessToken: 'access',
        refreshToken: 'refresh',
      };

      // Mock existing provider to simulate duplicate
      prismaService.$transaction.mockImplementation(async (fn) => {
        const mockPrisma = {
          user: { findUnique: jest.fn(), create: jest.fn() },
          userProvider: {
            findUnique: jest.fn().mockResolvedValue({
              id: 1,
              userId: 10,
              provider: oauthData.provider,
              providerUserId: oauthData.providerUserId,
            }),
            create: jest.fn(),
          },
          auditLog: { create: jest.fn() },
        };
        return await fn(mockPrisma);
      });

      await expect(service.handleOAuthLogin(oauthData)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
