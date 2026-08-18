/**
 * Idempotent test seed for the SHOP_MANAGER / SALESMAN roles.
 *
 *   shopa@gmail.com      SHOP_MANAGER  -> owns "Shop A"  (+ wallet)
 *   shopb@gmail.com      SHOP_MANAGER  -> owns "Shop B"  (+ wallet)
 *   salesmana@gmail.com  SALESMAN      -> works under Shop A manager (no wallet/store)
 *   salesmanb@gmail.com  SALESMAN      -> works under Shop B manager (no wallet/store)
 *
 * Password for all four: password123
 *
 * Uses upsert only — safe to run repeatedly, never resets data.
 * Run with:  node src/seedManagers.js
 */
import prisma from './lib/prisma.js';
import bcrypt from 'bcryptjs';

const PASSWORD = 'password123';

// Each shop: a SHOP_MANAGER owner + a SALESMAN that works under them.
const shops = [
  { shop: 'Shop A', manager: { email: 'shopa@gmail.com', name: 'Shop A Manager' }, salesman: { email: 'salesmana@gmail.com', name: 'Salesman A' } },
  { shop: 'Shop B', manager: { email: 'shopb@gmail.com', name: 'Shop B Manager' }, salesman: { email: 'salesmanb@gmail.com', name: 'Salesman B' } },
];

// Interim MANAGER test accounts from the earlier pass — remove so we don't keep
// duplicate "Shop A"/"Shop B" stores. Deleting the user cascades store + wallet.
const removeEmails = ['managera@gmail.com', 'managerb@gmail.com'];

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);

  for (const email of removeEmails) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.delete({ where: { id: existing.id } });
      console.log(`🗑  removed interim account ${email}`);
    }
  }

  for (const s of shops) {
    // SHOP_MANAGER (store + wallet owner)
    const manager = await prisma.user.upsert({
      where: { email: s.manager.email },
      update: { role: 'SHOP_MANAGER', name: s.manager.name, password: hashedPassword, authProvider: 'EMAIL', managerId: null },
      create: {
        email: s.manager.email,
        password: hashedPassword,
        name: s.manager.name,
        role: 'SHOP_MANAGER',
        authProvider: 'EMAIL',
        isVerified: true,
      },
    });

    const store = await prisma.store.upsert({
      where: { ownerId: manager.id },
      update: { name: s.shop },
      create: { name: s.shop, ownerId: manager.id },
    });

    await prisma.wallet.upsert({
      where: { userId: manager.id },
      update: {},
      create: { userId: manager.id },
    });

    // SALESMAN working under this manager (operational only — no store/wallet)
    await prisma.user.upsert({
      where: { email: s.salesman.email },
      update: { role: 'SALESMAN', name: s.salesman.name, password: hashedPassword, authProvider: 'EMAIL', managerId: manager.id },
      create: {
        email: s.salesman.email,
        password: hashedPassword,
        name: s.salesman.name,
        role: 'SALESMAN',
        authProvider: 'EMAIL',
        isVerified: true,
        managerId: manager.id,
      },
    });

    console.log(`✔ ${s.shop}: manager ${s.manager.email} (store ${store.id}) + salesman ${s.salesman.email}`);
  }
}

main()
  .then(async () => {
    console.log(`Done. All test accounts use password: ${PASSWORD}`);
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
