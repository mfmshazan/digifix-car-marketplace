import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'ishadipraveena22@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  console.log('User check for:', email);
  console.log(user ? 'User FOUND' : 'User NOT FOUND');
  if (user) console.log('Details:', JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
