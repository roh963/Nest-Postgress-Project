import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  await prisma.user.deleteMany({ where: { email: { in: ['admin@example.com', 'user@example.com'] } } });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'admin',
    },
  });
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: await bcrypt.hash('user123', 10),
      role: 'user',
    },
  });
  await prisma.feedback.deleteMany({ where: { userId: { in: [admin.id, user.id] } } });
  const feedbacks = Array.from({ length: 1000 }, (_, i) => ({
    name: `User ${i}`,
    email: `test${i}@example.com`,
    message: `Feedback ${i}`,
    userId: i % 2 === 0 ? admin.id : user.id,
  }));
  await prisma.feedback.createMany({ data: feedbacks });
  console.log('Seeded 2 users, 1000 feedbacks');
}

seed().finally(() => prisma.$disconnect());