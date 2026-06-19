import dotenv from 'dotenv';
dotenv.config({ override: true });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Current DATABASE_URL:', process.env.DATABASE_URL?.split('@')[1] || 'NOT SET');
  const email = 'ishadipraveena22@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  console.log('User found in this DB:', !!user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
