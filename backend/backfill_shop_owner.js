import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * One-time backfill: products, car parts, and orders that were mistakenly
 * recorded against a SALESMAN's own id are moved to that salesman's MANAGER id,
 * so they match how dashboards query (resolveShopOwnerId) and become visible.
 *
 * Dry run by default. Pass --apply to actually write changes.
 */
async function main() {
  const APPLY = process.argv.includes('--apply');

  // Salesmen that operate under a manager (the ones whose items were mis-owned).
  const salesmen = await prisma.user.findMany({
    where: { role: 'SALESMAN', managerId: { not: null } },
    select: { id: true, managerId: true, name: true },
  });
  const map = new Map(salesmen.map((s) => [s.id, s.managerId]));
  const salesmanIds = [...map.keys()];

  console.log(`Salesmen with a manager: ${map.size}`);
  for (const s of salesmen) console.log(`  ${s.name} (${s.id}) -> manager ${s.managerId}`);

  const products = await prisma.product.findMany({ where: { salesmanId: { in: salesmanIds } }, select: { id: true } });
  const carParts = await prisma.carPart.findMany({ where: { sellerId: { in: salesmanIds } }, select: { id: true } });
  const orders = await prisma.order.findMany({ where: { salesmanId: { in: salesmanIds } }, select: { id: true, orderNumber: true } });

  console.log(`\nWould reassign:`);
  console.log(`  Products : ${products.length}`);
  console.log(`  CarParts : ${carParts.length}`);
  console.log(`  Orders   : ${orders.length}  ${orders.map((o) => o.orderNumber).join(', ')}`);

  if (!APPLY) {
    console.log('\n🔎 DRY RUN — nothing changed. Re-run with:  node backfill_shop_owner.js --apply');
    return;
  }

  let p = 0, c = 0, o = 0;
  for (const [salesmanId, managerId] of map) {
    p += (await prisma.product.updateMany({ where: { salesmanId }, data: { salesmanId: managerId } })).count;
    c += (await prisma.carPart.updateMany({ where: { sellerId: salesmanId }, data: { sellerId: managerId } })).count;
    o += (await prisma.order.updateMany({ where: { salesmanId }, data: { salesmanId: managerId } })).count;
  }
  console.log(`\n✅ Applied. Products=${p}  CarParts=${c}  Orders=${o}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
