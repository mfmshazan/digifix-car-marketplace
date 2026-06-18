-- Rename tables
ALTER TABLE "rider_delivery_partners" RENAME TO "Rider";
ALTER TABLE "rider_delivery_jobs" RENAME TO "DeliveryJob";
ALTER TABLE "rider_delivery_request_offers" RENAME TO "DeliveryOffer";
ALTER TABLE "rider_job_tracking" RENAME TO "DeliveryTracking";
ALTER TABLE "rider_refresh_tokens" RENAME TO "RiderToken";

-- Rename sequences (optional but good practice)
ALTER SEQUENCE IF EXISTS "rider_delivery_partners_id_seq" RENAME TO "Rider_id_seq";
ALTER SEQUENCE IF EXISTS "rider_delivery_jobs_id_seq" RENAME TO "DeliveryJob_id_seq";
ALTER SEQUENCE IF EXISTS "rider_delivery_request_offers_id_seq" RENAME TO "DeliveryOffer_id_seq";
ALTER SEQUENCE IF EXISTS "rider_job_tracking_id_seq" RENAME TO "DeliveryTracking_id_seq";
ALTER SEQUENCE IF EXISTS "rider_refresh_tokens_id_seq" RENAME TO "RiderToken_id_seq";

-- Add Proof of Delivery columns to DeliveryJob
ALTER TABLE "DeliveryJob" ADD COLUMN "proof_photo_url" TEXT;
ALTER TABLE "DeliveryJob" ADD COLUMN "proof_signature_data" TEXT;
ALTER TABLE "DeliveryJob" ADD COLUMN "proof_recipient_name" VARCHAR(255);
ALTER TABLE "DeliveryJob" ADD COLUMN "proof_notes" TEXT;
ALTER TABLE "DeliveryJob" ADD COLUMN "proof_delivery_latitude" DECIMAL(10,8);
ALTER TABLE "DeliveryJob" ADD COLUMN "proof_delivery_longitude" DECIMAL(11,8);
ALTER TABLE "DeliveryJob" ADD COLUMN "proof_created_at" TIMESTAMP(3);

-- Migrate data safely from proof table to main table
UPDATE "DeliveryJob" dj
SET 
  "proof_photo_url" = pod."photo_url",
  "proof_signature_data" = pod."signature_data",
  "proof_recipient_name" = pod."recipient_name",
  "proof_notes" = pod."notes",
  "proof_delivery_latitude" = pod."delivery_latitude",
  "proof_delivery_longitude" = pod."delivery_longitude",
  "proof_created_at" = pod."created_at"
FROM "rider_proof_of_delivery" pod
WHERE dj.id = pod.job_id;

-- Drop the old redundant tables (safe now because data is moved)
DROP TABLE IF EXISTS "rider_proof_of_delivery";
DROP TABLE IF EXISTS "rider_job_status_logs";
