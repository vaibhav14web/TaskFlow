import 'dotenv/config';
import { prisma } from './src/utils/prisma';
import { hashPassword } from './src/utils/auth';

async function main() {
  const email = 'test@test.com';
  const password = 'password123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      emailVerified: true
    },
    create: {
      name: 'Test User',
      email,
      passwordHash,
      emailVerified: true
    }
  });

  console.log('Successfully seeded user:', user.email);
}

main()
  .catch((e) => {
    console.error('Error seeding user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
