import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'test@example.com',
    password: 'Password123',
    role: 'user',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Optional: enable global validation pipe if used in your app
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test to avoid duplicates
    await prisma.auditLog.deleteMany();
    await prisma.userProvider.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.user.deleteMany();
  });

  it('POST /auth/register should register a user', async () => {
    const response: Response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'User registered',
        user: expect.objectContaining({
          id: expect.any(Number),
          email: testUser.email,
          role: testUser.role,
          createdAt: expect.any(String),
        }),
      }),
    );
  });

  it('POST /auth/register should return 409 for duplicate email', async () => {
    // First registration
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    // Duplicate registration
    const response: Response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(409);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'Email already exists',
        code: 409,
      }),
    );
  });

  it('POST /auth/login should return tokens for valid credentials', async () => {
    // Ensure user exists
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const response: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201); // your login endpoint currently returns 201

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        email: testUser.email,
        role: testUser.role,
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      }),
    );
  });

  it('POST /auth/login should return 401 for invalid credentials', async () => {
    // Ensure user exists
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const response: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword' })
      .expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'Invalid credentials',
        code: 401,
      }),
    );
  });
});
