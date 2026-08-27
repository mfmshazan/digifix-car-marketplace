-- Split / partial wallet payment: records how much of Order.total was funded
-- from the customer's own wallet at checkout. The remainder (total - walletAmount)
-- is covered by Order.paymentMethod (Stripe / COD). 0 = no wallet used.
ALTER TABLE "Order" ADD COLUMN "walletAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
