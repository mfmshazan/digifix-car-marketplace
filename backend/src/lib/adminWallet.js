/**
 * Admin Wallet Service
 * The Admin acts as the central clearinghouse for all platform transactions.
 * Every payment enters via Admin and exits via Admin, keeping the ledger balanced.
 *
 * Money flow:
 *  Stripe card payment  →  DEPOSIT (null → Admin)
 *  Order DELIVERED      →  SALE_EARNING (Admin → Salesman)
 *  Order REFUNDED       →  REFUND (Admin → Customer)
 *  Salesman PAYOUT      →  PAYOUT (Salesman → null) + stripe.transfers.create
 */

import prisma from './prisma.js';

// Module-level cache so we don't query the DB on every transaction
let _cachedAdminWalletId = null;

/**
 * Returns the Admin's wallet record.
 * Looks up ADMIN_WALLET_ID from env first; falls back to finding the first ADMIN user.
 * Creates the admin wallet if it doesn't exist yet.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} [tx] - Optional prisma tx client
 */
export async function getAdminWallet(tx) {
  const db = tx || prisma;

  // 1. Try the cached ID (skip DB lookup on hot paths)
  if (_cachedAdminWalletId) {
    const wallet = await db.wallet.findUnique({ where: { id: _cachedAdminWalletId } });
    if (wallet) return wallet;
    _cachedAdminWalletId = null; // stale cache – fall through
  }

  // 2. Try the env override (useful in seeded environments)
  const envId = process.env.ADMIN_WALLET_ID;
  if (envId) {
    const wallet = await db.wallet.findUnique({ where: { id: envId } });
    if (wallet) {
      _cachedAdminWalletId = wallet.id;
      return wallet;
    }
  }

  // 3. Find the first ADMIN user and get/create their wallet
  const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) {
    throw new Error(
      'No ADMIN user found in the database. ' +
      'Create an admin user or set ADMIN_WALLET_ID in .env.'
    );
  }

  let adminWallet = await db.wallet.findUnique({ where: { userId: adminUser.id } });
  if (!adminWallet) {
    adminWallet = await db.wallet.create({ data: { userId: adminUser.id, balance: 0 } });
  }

  _cachedAdminWalletId = adminWallet.id;
  return adminWallet;
}

/**
 * Convenience: ensure a wallet exists for any userId.
 * @param {string} userId
 * @param {import('@prisma/client').Prisma.TransactionClient} [tx]
 */
export async function ensureWallet(userId, tx) {
  const db = tx || prisma;
  let wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await db.wallet.create({ data: { userId, balance: 0 } });
  }
  return wallet;
}
