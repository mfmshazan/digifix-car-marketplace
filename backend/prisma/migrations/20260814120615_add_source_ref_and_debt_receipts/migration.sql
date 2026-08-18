-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'DEBT_REPAYMENT';

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "sourceRef" TEXT;

-- CreateTable
CREATE TABLE "DebtReceipt" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "note" TEXT,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebtReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebtReceipt_walletId_idx" ON "DebtReceipt"("walletId");

-- CreateIndex
CREATE INDEX "DebtReceipt_status_idx" ON "DebtReceipt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_sourceRef_key" ON "WalletTransaction"("sourceRef");

-- AddForeignKey
ALTER TABLE "DebtReceipt" ADD CONSTRAINT "DebtReceipt_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
