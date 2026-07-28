-- Phase 2: workspace-scoped business tracker, reminders and document links.

ALTER TABLE "UploadedDocument"
  ADD COLUMN "analysisStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "category" TEXT,
  ADD COLUMN "contactId" TEXT,
  ADD COLUMN "documentDate" TIMESTAMP(3),
  ADD COLUMN "dueDate" TIMESTAMP(3),
  ADD COLUMN "workspaceId" TEXT;

CREATE TABLE "BusinessRecord" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "direction" TEXT NOT NULL DEFAULT 'neutral',
  "amount" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "dueAt" TIMESTAMP(3),
  "originalDueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "contactId" TEXT,
  "assignedToId" INTEGER,
  "createdById" INTEGER NOT NULL,
  "updatedById" INTEGER,
  "recurrenceRule" TEXT,
  "parentRecordId" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessRecordHistory" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "actorId" INTEGER,
  "action" TEXT NOT NULL,
  "previousData" TEXT,
  "newData" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessRecordHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessReminder" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "recipientId" INTEGER NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'in_app',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "sentAt" TIMESTAMP(3),
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessNotification" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "recordId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessRecordDocument" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "attachedById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessRecordDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentSuggestion" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "suggestionType" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "evidence" TEXT,
  "status" TEXT NOT NULL DEFAULT 'proposed',
  "reviewedById" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BusinessRecord_workspaceId_type_idx" ON "BusinessRecord"("workspaceId", "type");
CREATE INDEX "BusinessRecord_workspaceId_status_idx" ON "BusinessRecord"("workspaceId", "status");
CREATE INDEX "BusinessRecord_workspaceId_dueAt_idx" ON "BusinessRecord"("workspaceId", "dueAt");
CREATE INDEX "BusinessRecord_workspaceId_assignedToId_idx" ON "BusinessRecord"("workspaceId", "assignedToId");
CREATE INDEX "BusinessRecord_workspaceId_contactId_idx" ON "BusinessRecord"("workspaceId", "contactId");
CREATE INDEX "BusinessRecord_workspaceId_archivedAt_idx" ON "BusinessRecord"("workspaceId", "archivedAt");
CREATE INDEX "BusinessRecordHistory_recordId_createdAt_idx" ON "BusinessRecordHistory"("recordId", "createdAt");
CREATE INDEX "BusinessRecordHistory_workspaceId_createdAt_idx" ON "BusinessRecordHistory"("workspaceId", "createdAt");
CREATE UNIQUE INDEX "BusinessReminder_dedupeKey_key" ON "BusinessReminder"("dedupeKey");
CREATE INDEX "BusinessReminder_workspaceId_status_idx" ON "BusinessReminder"("workspaceId", "status");
CREATE INDEX "BusinessReminder_scheduledAt_status_idx" ON "BusinessReminder"("scheduledAt", "status");
CREATE INDEX "BusinessNotification_workspaceId_userId_readAt_idx" ON "BusinessNotification"("workspaceId", "userId", "readAt");
CREATE INDEX "BusinessNotification_workspaceId_userId_createdAt_idx" ON "BusinessNotification"("workspaceId", "userId", "createdAt");
CREATE INDEX "BusinessRecordDocument_workspaceId_idx" ON "BusinessRecordDocument"("workspaceId");
CREATE INDEX "BusinessRecordDocument_documentId_idx" ON "BusinessRecordDocument"("documentId");
CREATE UNIQUE INDEX "BusinessRecordDocument_recordId_documentId_key" ON "BusinessRecordDocument"("recordId", "documentId");
CREATE INDEX "DocumentSuggestion_workspaceId_documentId_idx" ON "DocumentSuggestion"("workspaceId", "documentId");
CREATE INDEX "DocumentSuggestion_status_idx" ON "DocumentSuggestion"("status");
CREATE INDEX "UploadedDocument_workspaceId_archivedAt_idx" ON "UploadedDocument"("workspaceId", "archivedAt");
CREATE INDEX "UploadedDocument_workspaceId_category_idx" ON "UploadedDocument"("workspaceId", "category");
CREATE INDEX "UploadedDocument_contactId_idx" ON "UploadedDocument"("contactId");

ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "BusinessContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessRecord" ADD CONSTRAINT "BusinessRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRecord" ADD CONSTRAINT "BusinessRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "BusinessContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessRecord" ADD CONSTRAINT "BusinessRecord_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessRecord" ADD CONSTRAINT "BusinessRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessRecord" ADD CONSTRAINT "BusinessRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessRecord" ADD CONSTRAINT "BusinessRecord_parentRecordId_fkey" FOREIGN KEY ("parentRecordId") REFERENCES "BusinessRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessRecordHistory" ADD CONSTRAINT "BusinessRecordHistory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRecordHistory" ADD CONSTRAINT "BusinessRecordHistory_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "BusinessRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessReminder" ADD CONSTRAINT "BusinessReminder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessReminder" ADD CONSTRAINT "BusinessReminder_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "BusinessRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessReminder" ADD CONSTRAINT "BusinessReminder_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessNotification" ADD CONSTRAINT "BusinessNotification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessNotification" ADD CONSTRAINT "BusinessNotification_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "BusinessRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessNotification" ADD CONSTRAINT "BusinessNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRecordDocument" ADD CONSTRAINT "BusinessRecordDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRecordDocument" ADD CONSTRAINT "BusinessRecordDocument_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "BusinessRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRecordDocument" ADD CONSTRAINT "BusinessRecordDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentSuggestion" ADD CONSTRAINT "DocumentSuggestion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentSuggestion" ADD CONSTRAINT "DocumentSuggestion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
