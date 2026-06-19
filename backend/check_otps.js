import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const otps = await prisma.passwordResetOtp.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Last 5 OTPs:', JSON.stringify(otps, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
