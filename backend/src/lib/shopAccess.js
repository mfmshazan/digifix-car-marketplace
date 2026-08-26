import prisma from './prisma.js';

/**
 * Resolve the "shop owner" user id used to scope catalog & order queries.
 *
 * A SALESMAN operates under a SHOP_MANAGER, so the shop's products and orders
 * are all owned by (recorded against) the manager's id. For a salesman we
 * therefore return their managerId — falling back to their own id for a legacy
 * self-registered salesman that has no manager. A SHOP_MANAGER (or any other
 * role) owns its own shop, so we return its own id.
 *
 * @param {{ id?: string, userId?: string, role?: string }} reqUser  req.user
 * @returns {Promise<string>} the shop owner's user id
 */
export const resolveShopOwnerId = async (reqUser) => {
  const userId = reqUser?.id || reqUser?.userId;
  if (reqUser?.role === 'SALESMAN') {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { managerId: true },
    });
    return me?.managerId || userId;
  }
  return userId;
};

/**
 * All user ids that should be kept in sync about a shop's order activity:
 * the manager (shop owner) plus every salesman working under them. Used to
 * fan out socket events and push notifications so salesmen — not just the
 * manager — see new orders and status changes.
 *
 * Accepts either the manager id or one of their salesman ids. This keeps
 * legacy records scoped to a salesman visible to the whole shop.
 *
 * @param {string} shopOwnerOrMemberId  manager / shop member id
 * @returns {Promise<string[]>} [shopOwnerId, ...salesmanIds]
 */
export const getShopMemberIds = async (shopOwnerOrMemberId) => {
  if (!shopOwnerOrMemberId) return [];

  // Most callers pass the manager id. Resolve that user and its direct reports
  // together so the common path costs one database round trip instead of two.
  const [user, directSalesmen] = await Promise.all([
    prisma.user.findUnique({
      where: { id: shopOwnerOrMemberId },
      select: { role: true, managerId: true },
    }),
    prisma.user.findMany({
      where: { managerId: shopOwnerOrMemberId },
      select: { id: true },
    }),
  ]);
  const shopOwnerId = user?.role === 'SALESMAN' && user.managerId
    ? user.managerId
    : shopOwnerOrMemberId;

  const salesmen = shopOwnerId === shopOwnerOrMemberId
    ? directSalesmen
    : await prisma.user.findMany({
        where: { managerId: shopOwnerId },
        select: { id: true },
      });
  return [shopOwnerId, ...salesmen.map((s) => s.id)];
};
