-- Multiple nearby riders may receive the same delivery request. Assignment is
-- still protected by the locked DeliveryJob row; the winner cancels all other
-- pending offers in the same transaction.
DROP INDEX IF EXISTS "idx_rider_dispatch_single_pending_job";
