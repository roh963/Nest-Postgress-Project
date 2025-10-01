import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin123', 10);
  const userPassword = await bcrypt.hash('User123', 10);

  await prisma.$transaction(async (prisma) => {
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        passwordHash: adminPassword,
        role: 'admin',
      },
    });

    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        passwordHash: userPassword,
        role: 'user',
      },
    });

    await prisma.feedback.createMany({
      data: [
        {
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Great app!',
          userId: user.id,
        },
        {
          name: 'Jane Doe',
          email: 'jane@example.com',
          message: 'Needs more features.',
          userId: user.id,
        },
      ],
      skipDuplicates: true,
    });

    await prisma.auditLog.createMany({
      data: [
        {
          userId: admin.id,
          action: 'SEED_CREATED',
          details: 'Admin user created via seed',
        },
        {
          userId: user.id,
          action: 'SEED_CREATED',
          details: 'User created via seed',
        },
      ],
      skipDuplicates: true,
    });
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
