import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      items: { select: { productId: true, carPartId: true, itemName: true, itemType: true } },
      customer: { select: { id: true, name: true, role: true } },
      salesman: { select: { id: true, name: true, role: true, managerId: true } },
    },
  });

  for (const o of orders) {
    console.log('\n=========================================');
    console.log(`Order ${o.orderNumber}  status=${o.status}  created=${o.createdAt.toISOString()}`);
    console.log(`  customer     : ${o.customer?.name} (${o.customerId})`);
    console.log(`  order.salesmanId -> ${o.salesmanId}`);
    console.log(`  salesman user: name=${o.salesman?.name} role=${o.salesman?.role} managerId=${o.salesman?.managerId ?? 'null'}`);

    // Who would the dashboard resolve to for this "owner" user?
    const ownerIfManager = o.salesman?.role === 'SALESMAN'
      ? (o.salesman?.managerId || o.salesman?.id)
      : o.salesman?.id;
    console.log(`  => a viewer's dashboard query filters by salesmanId = <their resolved shop-owner id>`);

    // Trace the actual product owner for the first item
    for (const it of o.items) {
      if (it.productId) {
        const p = await prisma.product.findUnique({
          where: { id: it.productId },
          select: { name: true, salesmanId: true },
        });
        console.log(`  item PRODUCT "${it.itemName}" -> product.salesmanId = ${p?.salesmanId}`);
      } else if (it.carPartId) {
        const cp = await prisma.carPart.findUnique({
          where: { id: it.carPartId },
          select: { name: true, sellerId: true },
        });
        console.log(`  item CARPART  "${it.itemName}" -> carPart.sellerId = ${cp?.sellerId}`);
      }
    }
  }

  // List all shop staff so we can see who owns what
  console.log('\n=========== SHOP STAFF (managers & salesmen) ===========');
  const staff = await prisma.user.findMany({
    where: { role: { in: ['SHOP_MANAGER', 'SALESMAN'] } },
    select: { id: true, name: true, role: true, managerId: true },
  });
  for (const u of staff) {
    console.log(`  ${u.role.padEnd(12)} ${u.name?.padEnd(20)} id=${u.id} managerId=${u.managerId ?? 'null'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
