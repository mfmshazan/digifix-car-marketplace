import { randomUUID } from 'crypto';
import prisma from '../lib/prisma.js';
import { getAdminWallet, ensureWallet } from '../lib/adminWallet.js';

/**
 * Credits the driver's wallet for a completed delivery.
 * MUST be called from inside the caller's existing pg `client` transaction
 * (the one that flips DeliveryJob.status to 'delivered'), right before COMMIT,
 * so the wallet movement is atomic with the status change.
 *
 * Idempotent: the unique WalletTransaction.sourceRef ("DRIVER_FEE_JOB_<id>")
 * guarantees a given job is only ever credited once, even if this is called
 * from multiple transition paths or the request is retried.
 */
export async function creditDriverDeliveryFee(client, jobId) {
    const jobDetail = await client.query(
        `SELECT dj.payment_amount, r.email
       FROM "DeliveryJob" dj
       JOIN "Rider" r ON r.id = dj.partner_id
      WHERE dj.id = $1`,
        [jobId]
    );
    const row = jobDetail.rows[0];
    if (!row || !row.payment_amount || Number(row.payment_amount) <= 0) return;

    const deliveryFee = Number(row.payment_amount);
    const riderEmail = row.email;

    // Riders are synced into the User table by email on registration (riderAuth.controller.js).
    const driverUser = await prisma.user.findUnique({ where: { email: riderEmail }, select: { id: true } });
    if (!driverUser) {
        console.warn(`[driverEarnings] No synced User for rider email ${riderEmail} — job ${jobId} not credited.`);
        return;
    }

    const driverWallet = await ensureWallet(driverUser.id);
    const adminWallet = await getAdminWallet();

    const insertResult = await client.query(
        `INSERT INTO "WalletTransaction"
       (id, amount, type, "senderWalletId", "receiverWalletId", "sourceRef", description, "createdAt")
     VALUES ($1, $2, 'DELIVERY_FEE', $3, $4, $5, $6, NOW())
     ON CONFLICT ("sourceRef") DO NOTHING
     RETURNING id`,
        [randomUUID(), deliveryFee, adminWallet.id, driverWallet.id, `DRIVER_FEE_JOB_${jobId}`, `Delivery fee for job #${jobId}`]
    );

    if (insertResult.rows.length === 0) return; // already credited — idempotent no-op

    await client.query(`UPDATE "Wallet" SET balance = balance - $1, "updatedAt" = NOW() WHERE id = $2`, [deliveryFee, adminWallet.id]);
    await client.query(`UPDATE "Wallet" SET balance = balance + $1, "updatedAt" = NOW() WHERE id = $2`, [deliveryFee, driverWallet.id]);
}