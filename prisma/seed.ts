import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user1234', 10);

  await prisma.user.upsert({
    where: { email: 'admin@coworking.com' },
    update: { password: adminPassword, role: Role.ADMIN },
    create: {
      name: 'Admin',
      email: 'admin@coworking.com',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@coworking.com' },
    update: { password: userPassword, role: Role.USER },
    create: {
      name: 'Usuario Teste',
      email: 'user@coworking.com',
      password: userPassword,
      role: Role.USER,
    },
  });

  console.log(
    'Seed concluído: admin@coworking.com / admin123, user@coworking.com / user1234',
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
