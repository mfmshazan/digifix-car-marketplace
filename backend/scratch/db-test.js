
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

async function testConnection(url, name) {
  console.log(`\n--- Testing ${name} ---`);
  console.log(`URL: ${url.split('@')[1]}`); // Log only the host part for safety
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });

  try {
    console.log('Connecting...');
    await prisma.$connect();
    console.log('Successfully connected!');
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users.`);
  } catch (error) {
    console.error('Failed:');
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await testConnection(process.env.DATABASE_URL, 'Pooled Connection (6543)');
  await testConnection(process.env.DIRECT_URL, 'Direct Connection (5432)');
}

main();
