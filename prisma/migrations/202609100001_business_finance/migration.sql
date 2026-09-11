-- Additive migration; existing records retain their balances and classifications.
CREATE TABLE "BusinessAccount" (
 "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL,
 "currency" TEXT NOT NULL DEFAULT 'TRY', "openingBalance" DECIMAL(18,2) NOT NULL,
 "openingAt" TIMESTAMP(3) NOT NULL, "archivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BusinessAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "BusinessLoan" (
 "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "institution" TEXT NOT NULL,
 "amount" DECIMAL(18,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'TRY', "installmentCount" INTEGER NOT NULL,
 "installmentAmount" DECIMAL(18,2) NOT NULL, "firstPaymentAt" TIMESTAMP(3) NOT NULL, "requestKey" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BusinessLoan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "BusinessEmployee" (
 "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "name" TEXT NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL,
 "salaryAmount" DECIMAL(18,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'TRY', "insured" BOOLEAN NOT NULL DEFAULT false,
 "leaveAllowance" DECIMAL(6,1) NOT NULL DEFAULT 0, "archivedAt" TIMESTAMP(3), "requestKey" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BusinessEmployee_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "BusinessEmployeeLeave" (
 "id" TEXT PRIMARY KEY, "employeeId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "days" DECIMAL(6,1) NOT NULL,
 "requestKey" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BusinessEmployeeLeave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "BusinessEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "BusinessRecord" ADD COLUMN "accountId" TEXT, ADD COLUMN "loanId" TEXT, ADD COLUMN "installmentNo" INTEGER,
 ADD COLUMN "employeeId" TEXT, ADD COLUMN "settlementAt" TIMESTAMP(3), ADD COLUMN "category" TEXT, ADD COLUMN "sourceKey" TEXT;
ALTER TABLE "BusinessRecord" ADD CONSTRAINT "BusinessRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BusinessAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessRecord" ADD CONSTRAINT "BusinessRecord_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "BusinessLoan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessRecord" ADD CONSTRAINT "BusinessRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "BusinessEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessSetting" ADD COLUMN "taxProfile" TEXT NOT NULL DEFAULT '{}';
CREATE INDEX "BusinessAccount_workspaceId_idx" ON "BusinessAccount"("workspaceId");
CREATE INDEX "BusinessLoan_workspaceId_idx" ON "BusinessLoan"("workspaceId");
CREATE UNIQUE INDEX "BusinessLoan_workspaceId_requestKey_key" ON "BusinessLoan"("workspaceId", "requestKey");
CREATE INDEX "BusinessEmployee_workspaceId_idx" ON "BusinessEmployee"("workspaceId");
CREATE UNIQUE INDEX "BusinessEmployee_workspaceId_requestKey_key" ON "BusinessEmployee"("workspaceId", "requestKey");
CREATE UNIQUE INDEX "BusinessEmployeeLeave_employeeId_requestKey_key" ON "BusinessEmployeeLeave"("employeeId", "requestKey");
CREATE UNIQUE INDEX "BusinessRecord_workspaceId_sourceKey_key" ON "BusinessRecord"("workspaceId", "sourceKey");
CREATE INDEX "BusinessRecord_accountId_status_completedAt_idx" ON "BusinessRecord"("accountId", "status", "completedAt");
CREATE INDEX "BusinessRecord_loanId_idx" ON "BusinessRecord"("loanId");
CREATE INDEX "BusinessRecord_employeeId_idx" ON "BusinessRecord"("employeeId");
