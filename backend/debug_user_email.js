import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ 
      where: { email: { contains: 'ishadipraveena22', mode: 'insensitive' } } 
  });
  console.log('Result count:', users.length);
  users.forEach(u => {
    console.log(`Email in DB: [${u.email}] (Length: ${u.email.length})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
