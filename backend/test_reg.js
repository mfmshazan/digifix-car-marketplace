import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'test_delivery_' + Date.now() + '@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    console.log('Attempting to create user with DELIVERY_PARTNER role...');
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Test Delivery Partner',
        phone: '1234567890',
        role: 'DELIVERY_PARTNER',
        authProvider: 'EMAIL',
      },
    });
    console.log('Success! User created:', user);
    
    // Clean up
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Test user cleaned up.');
  } catch (error) {
    console.error('Registration failed in script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
