-- Abonelik ve odeme.
--
-- Plan tablosu BILEREK YOK: plan tanimlari `src/config/billing.ts`
-- icinde tek kaynak ve fiyatlar oradan turetiliyor. Ikinci bir
-- dogruluk kaynagi, ekranda gorunen fiyat ile tahsil edilen tutarin
-- ayrismasi demek olurdu.
--
-- Abonelik KULLANICI basina (userId unique): kullanici oder, butun
-- isletmelerinde kullanir.

CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- Yenilemenin otomatik mi elle mi oldugu. Urun sahibi OTOMATIK'e karar
-- verdi ve yasal metinler bunu taahhut ediyor; ancak kayitli kartla
-- tekrarlayan tahsilat PayTR'de AYRI bir yetki ve verildigi henuz teyit
-- edilmedi. Alan bastan burada ki cevap degisirse goc gerekmesin.
CREATE TYPE "RenewalMode" AS ENUM ('AUTO', 'MANUAL');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "period" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "renewalMode" "RenewalMode" NOT NULL DEFAULT 'AUTO',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "providerCardToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "merchantOid" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'paytr',
    "failReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- Yenileme zamanlayicisinin erisim deseni: suresi dolan aktif abonelikler.
CREATE INDEX "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");

-- 🔴 Idempotency'nin veritabani seviyesindeki dayanagi. PayTR "OK"
-- alana kadar callback'i tekrar tekrar gonderiyor; ayni siparis icin
-- ikinci bir Payment satiri olusmasini uygulama kontrolu tek basina
-- engelleyemez (es zamanli iki callback yaris eder).
CREATE UNIQUE INDEX "Payment_merchantOid_key" ON "Payment"("merchantOid");

CREATE INDEX "Payment_subscriptionId_createdAt_idx" ON "Payment"("subscriptionId", "createdAt");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
