import dotenv from 'dotenv';

dotenv.config({ override: true });

const { riderPool } = await import('../src/lib/riderDb.js');

const jobId = Number(process.argv[2] || 65);

async function main() {
  const client = await riderPool.connect();

  try {
    const jobResult = await client.query(
      `SELECT job.id, job.status, job.partner_id,
              job.marketplace_order_id IS NOT NULL AS has_marketplace_order,
              job.proof_photo_url IS NOT NULL AS has_proof_photo,
              job.proof_signature_data IS NOT NULL AS has_proof_signature,
              job.proof_created_at,
              rider.email,
              EXISTS (
                SELECT 1 FROM "User" app_user WHERE LOWER(app_user.email) = LOWER(rider.email)
              ) AS has_app_user
         FROM "DeliveryJob" job
         LEFT JOIN "Rider" rider ON rider.id = job.partner_id
        WHERE job.id = $1`,
      [jobId]
    );

    const job = jobResult.rows[0] || null;
    console.log('Job diagnostic:', job ? {
      id: job.id,
      status: job.status,
      partnerId: job.partner_id,
      hasMarketplaceOrder: job.has_marketplace_order,
      hasProofPhoto: job.has_proof_photo,
      hasProofSignature: job.has_proof_signature,
      proofCreatedAt: job.proof_created_at,
      hasRiderEmail: Boolean(job.email),
      hasAppUser: job.has_app_user,
    } : null);

    if (job?.email) {
      const walletResult = await client.query(
        `SELECT app_user.id, app_user.role::text AS role, wallet.id AS wallet_id
           FROM "User" app_user
           LEFT JOIN "Wallet" wallet ON wallet."userId" = app_user.id
          WHERE LOWER(app_user.email) = LOWER($1)`,
        [job.email]
      );
      console.log('Wallet identity diagnostic:', walletResult.rows[0] || null);

      if (walletResult.rows[0]?.wallet_id) {
        const transactionTypes = await client.query(
          `SELECT type::text AS type, COUNT(*)::int AS count
             FROM "WalletTransaction"
            WHERE "senderWalletId" = $1 OR "receiverWalletId" = $1
            GROUP BY type
            ORDER BY type`,
          [walletResult.rows[0].wallet_id]
        );
        console.log('Rider wallet transaction types:', transactionTypes.rows);
      }
    }

    const tracking = await client.query(
      `SELECT COUNT(*)::int AS count,
              MAX(recorded_at) AS latest_recorded_at
         FROM "DeliveryTracking"
        WHERE job_id = $1`,
      [jobId]
    );
    console.log('Tracking diagnostic:', tracking.rows[0]);

    const transactionTypeEnum = await client.query(
      `SELECT enumlabel
         FROM pg_enum
         JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = 'TransactionType'
        ORDER BY enumsortorder`
    );
    console.log('Live TransactionType values:', transactionTypeEnum.rows.map((row) => row.enumlabel));

    const columns = await client.query(
      `SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
          AND (
            table_name = 'DeliveryTracking'
            OR column_name LIKE 'proof_%'
            OR column_name IN ('current_latitude', 'current_longitude')
          )
        ORDER BY table_name, ordinal_position`,
      [['DeliveryTracking', 'DeliveryJob', 'Rider']]
    );
    console.log('Relevant live columns:', columns.rows);
  } finally {
    client.release();
    await riderPool.end();
  }
}

main().catch((error) => {
  console.error('Rider runtime diagnostic failed:', error);
  process.exitCode = 1;
});
