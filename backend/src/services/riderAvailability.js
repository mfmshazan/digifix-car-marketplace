const tableExists = async (executor) => {
  const result = await executor.query(
    `SELECT TO_REGCLASS('"RiderAvailabilitySession"') AS relation`
  );
  return Boolean(result.rows[0]?.relation);
};

export const recordRiderAvailability = async (
  executor,
  partnerId,
  nextStatus,
  reason = nextStatus
) => {
  try {
    if (!(await tableExists(executor))) {
      return;
    }

    if (nextStatus === 'online') {
      await executor.query(
        `INSERT INTO "RiderAvailabilitySession" (partner_id, started_at)
         SELECT $1, NOW()
          WHERE NOT EXISTS (
            SELECT 1
              FROM "RiderAvailabilitySession"
             WHERE partner_id = $1
               AND ended_at IS NULL
          )
         ON CONFLICT DO NOTHING`,
        [partnerId]
      );
      return;
    }

    await executor.query(
      `UPDATE "RiderAvailabilitySession"
          SET ended_at = NOW(),
              end_reason = $2
        WHERE partner_id = $1
          AND ended_at IS NULL`,
      [partnerId, reason]
    );
  } catch (error) {
    // Availability analytics must never interrupt an active delivery workflow.
    console.warn('Rider availability analytics update skipped:', error.message);
  }
};
