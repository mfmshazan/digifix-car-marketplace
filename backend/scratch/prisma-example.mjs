// ─────────────────────────────────────────────────────────────────────────────
// Prisma query examples for DigiFix.
// Run it:   cd backend && node scratch/prisma-example.mjs
// It only READS data — nothing is created, updated, or deleted.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1) findMany — get a list of rows (with a filter, sort, and limit)
  const pendingOrders = await prisma.order.findMany({
    where: { status: 'PENDING' },      // filter
    orderBy: { createdAt: 'desc' },     // newest first
    take: 5,                            // limit to 5
  });
  console.log('\n1) Latest 5 PENDING orders:');
  pendingOrders.forEach((o) => console.log(`   ${o.orderNumber}  total=${o.total}`));

  // 2) findUnique — get ONE row by a unique field (id)
  const firstOrderId = pendingOrders[0]?.id;
  if (firstOrderId) {
    const one = await prisma.order.findUnique({ where: { id: firstOrderId } });
    console.log(`\n2) Order by id ${firstOrderId.slice(-6)}: status=${one.status}`);
  }

  // 3) findFirst — first row matching a non-unique condition
  const defaultAddress = await prisma.address.findFirst({
    where: { isDefault: true },
  });
  console.log(`\n3) A default address: ${defaultAddress?.city ?? 'none found'}`);

  // 4) include — pull related rows in the same query (Order + its items + customer)
  if (firstOrderId) {
    const full = await prisma.order.findUnique({
      where: { id: firstOrderId },
      include: {
        items: true,                 // OrderItem[]
        customer: { select: { name: true, email: true } }, // only these fields
      },
    });
    console.log(`\n4) Order ${full.orderNumber} for ${full.customer?.name} has ${full.items.length} item(s)`);
  }

  // 5) count — how many rows match
  const productCount = await prisma.product.count({ where: { isActive: true } });
  console.log(`\n5) Active products: ${productCount}`);

  // 6) findMany with a search (contains, case-insensitive)
  const search = await prisma.product.findMany({
    where: { name: { contains: 'engine', mode: 'insensitive' } },
    select: { name: true, price: true },   // pick only these columns
    take: 3,
  });
  console.log('\n6) Products matching "engine":');
  search.forEach((p) => console.log(`   ${p.name} - ${p.price}`));
}

main()
  .catch((e) => console.error('Error:', e.message))
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
