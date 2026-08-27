-- One marketplace order can have only one delivery job. Existing retry logic
-- reuses that row, so this closes the concurrent create-request race without
-- deleting or rewriting production records.
CREATE UNIQUE INDEX "DeliveryJob_marketplace_order_id_key"
ON "DeliveryJob"("marketplace_order_id");
