import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'UserRole'
    `);
    console.log('Current UserRole values in DB:', result);

    const roleCounts = await prisma.$queryRawUnsafe(`
      SELECT role::text AS role, COUNT(*)::int AS count
      FROM "User"
      GROUP BY role
      ORDER BY role
    `);
    console.log('Current users by role:', roleCounts);

    const users = await prisma.user.findMany({
      select: { id: true, role: true },
    });
    console.log(`Prisma successfully decoded ${users.length} user roles.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
