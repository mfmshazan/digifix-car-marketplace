CREATE TABLE IF NOT EXISTS "RiderAvailabilitySession" (
    "id" SERIAL PRIMARY KEY,
    "partner_id" INTEGER NOT NULL REFERENCES "Rider"("id") ON DELETE CASCADE,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ended_at" TIMESTAMPTZ,
    "end_reason" VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS "idx_rider_availability_partner_started"
    ON "RiderAvailabilitySession" ("partner_id", "started_at");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_rider_availability_one_open_session"
    ON "RiderAvailabilitySession" ("partner_id")
    WHERE "ended_at" IS NULL;

INSERT INTO "RiderAvailabilitySession" ("partner_id", "started_at")
SELECT rider.id, NOW()
  FROM "Rider" rider
 WHERE rider.status = 'online'
   AND NOT EXISTS (
       SELECT 1
         FROM "RiderAvailabilitySession" session
        WHERE session."partner_id" = rider.id
          AND session."ended_at" IS NULL
   );
