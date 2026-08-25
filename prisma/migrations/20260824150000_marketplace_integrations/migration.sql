-- Pazaryeri entegrasyonlari: provider-bagimsiz sema.
--
-- Entegrasyon workspace'e aittir (user'a degil). Credential alanlari
-- sifrelidir; plaintext kolon YOKTUR. Tutar alanlarinda Float yoktur,
-- Decimal(18,2) kullanilir. metadata JSONB yalnizca provider'a ozgu
-- ek bilgiler icin; ana finansal degerler ortak kolonlardadir.
--
-- Mevcut davranis DEGISMIYOR: bu goc yalnizca yeni enum + tablo
-- olusturur, var olan hicbir tabloya veri yazmaz.

CREATE TYPE "IntegrationProvider" AS ENUM ('TRENDYOL', 'HEPSIBURADA', 'SHOPIFY', 'WOOCOMMERCE');
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISABLED');
CREATE TYPE "IntegrationSyncType" AS ENUM ('MANUAL', 'SCHEDULED', 'INITIAL');
CREATE TYPE "IntegrationSyncRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('CREATED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'UNKNOWN');

-- ============================================================
-- IntegrationConnection
-- ============================================================
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "displayName" TEXT,
    "encryptedApiKey" TEXT,
    "encryptedApiSecret" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "consecutiveFailureCount" INTEGER NOT NULL DEFAULT 0,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncIntervalMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationConnection_workspaceId_provider_externalAccountId_key" ON "IntegrationConnection"("workspaceId", "provider", "externalAccountId");
CREATE INDEX "IntegrationConnection_provider_status_idx" ON "IntegrationConnection"("provider", "status");
CREATE INDEX "IntegrationConnection_syncEnabled_lastSyncedAt_idx" ON "IntegrationConnection"("syncEnabled", "lastSyncedAt");

ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- IntegrationSyncRun
-- ============================================================
CREATE TABLE "IntegrationSyncRun" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "syncType" "IntegrationSyncType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "IntegrationSyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessageSafe" TEXT,
    "cursor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationSyncRun_connectionId_startedAt_idx" ON "IntegrationSyncRun"("connectionId", "startedAt");
CREATE INDEX "IntegrationSyncRun_status_startedAt_idx" ON "IntegrationSyncRun"("status", "startedAt");

ALTER TABLE "IntegrationSyncRun" ADD CONSTRAINT "IntegrationSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- MarketplaceOrder
-- ============================================================
CREATE TABLE "MarketplaceOrder" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalOrderNumber" TEXT,
    "externalCustomerId" TEXT,
    "customerDisplayName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2),
    "commissionAmount" DECIMAL(18,2),
    "shippingAmount" DECIMAL(18,2),
    "refundAmount" DECIMAL(18,2),
    "taxAmount" DECIMAL(18,2),
    "netContribution" DECIMAL(18,2),
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'UNKNOWN',
    "orderDate" TIMESTAMP(3) NOT NULL,
    "providerUpdatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketplaceOrder_workspaceId_provider_externalId_key" ON "MarketplaceOrder"("workspaceId", "provider", "externalId");
CREATE INDEX "MarketplaceOrder_workspaceId_provider_orderDate_idx" ON "MarketplaceOrder"("workspaceId", "provider", "orderDate");
CREATE INDEX "MarketplaceOrder_workspaceId_status_idx" ON "MarketplaceOrder"("workspaceId", "status");
CREATE INDEX "MarketplaceOrder_workspaceId_orderDate_idx" ON "MarketplaceOrder"("workspaceId", "orderDate");

ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- MarketplaceOrderItem
-- ============================================================
CREATE TABLE "MarketplaceOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "externalId" TEXT,
    "externalProductId" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2),
    "commissionAmount" DECIMAL(18,2),
    "shippingAllocation" DECIMAL(18,2),
    "refundAmount" DECIMAL(18,2),
    "netContribution" DECIMAL(18,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceOrderItem_orderId_idx" ON "MarketplaceOrderItem"("orderId");

ALTER TABLE "MarketplaceOrderItem" ADD CONSTRAINT "MarketplaceOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- MarketplaceProduct
-- ============================================================
CREATE TABLE "MarketplaceProduct" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "salePrice" DECIMAL(18,2),
    "listPrice" DECIMAL(18,2),
    "stockQuantity" INTEGER,
    "currency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "providerUpdatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketplaceProduct_workspaceId_provider_externalId_key" ON "MarketplaceProduct"("workspaceId", "provider", "externalId");
CREATE INDEX "MarketplaceProduct_workspaceId_isActive_idx" ON "MarketplaceProduct"("workspaceId", "isActive");

ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
