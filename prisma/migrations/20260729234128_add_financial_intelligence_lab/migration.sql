-- CreateTable
CREATE TABLE "FinancialModel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "engineType" TEXT NOT NULL DEFAULT 'deterministic',
    "engineVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "formulaDefinition" JSONB NOT NULL,
    "interpretationRules" JSONB NOT NULL,
    "warningRules" JSONB NOT NULL,
    "limitations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialModelVersion" (
    "id" TEXT NOT NULL,
    "financialModelId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "formulaDefinition" JSONB NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "interpretationRules" JSONB NOT NULL,
    "warningRules" JSONB NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialModelRun" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessId" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "caseId" TEXT,
    "scenarioName" TEXT NOT NULL DEFAULT 'base',
    "inputs" JSONB NOT NULL,
    "normalizedInputs" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL,
    "outputs" JSONB NOT NULL,
    "checks" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "confidence" JSONB NOT NULL,
    "calculationTrace" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialModelRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelAssumption" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "unit" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceReference" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "userVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCase" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "courseId" INTEGER,
    "difficulty" TEXT NOT NULL,
    "companyProfile" JSONB NOT NULL,
    "problemStatement" TEXT NOT NULL,
    "dataset" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "ethicalIssue" TEXT,
    "expectedModels" JSONB NOT NULL,
    "decisionContext" TEXT NOT NULL,
    "outcome" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionJournalEntry" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessId" TEXT NOT NULL,
    "modelRunId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "expectedOutcome" TEXT NOT NULL,
    "actualOutcome" TEXT,
    "variance" TEXT,
    "lessonLearned" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "DecisionJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCaseModel" (
    "caseId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "FinancialCaseModel_pkey" PRIMARY KEY ("caseId","modelId")
);

-- CreateTable
CREATE TABLE "FinancialModelCourse" (
    "modelId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,

    CONSTRAINT "FinancialModelCourse_pkey" PRIMARY KEY ("modelId","courseId")
);

-- CreateTable
CREATE TABLE "FinancialModelKnowledgeObject" (
    "modelId" TEXT NOT NULL,
    "koId" INTEGER NOT NULL,

    CONSTRAINT "FinancialModelKnowledgeObject_pkey" PRIMARY KEY ("modelId","koId")
);

-- CreateTable
CREATE TABLE "FinancialModelTaskTemplate" (
    "modelId" TEXT NOT NULL,
    "taskTemplateId" TEXT NOT NULL,

    CONSTRAINT "FinancialModelTaskTemplate_pkey" PRIMARY KEY ("modelId","taskTemplateId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialModel_code_key" ON "FinancialModel"("code");

-- CreateIndex
CREATE INDEX "FinancialModel_category_status_idx" ON "FinancialModel"("category", "status");

-- CreateIndex
CREATE INDEX "FinancialModelVersion_financialModelId_createdAt_idx" ON "FinancialModelVersion"("financialModelId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialModelVersion_financialModelId_version_key" ON "FinancialModelVersion"("financialModelId", "version");

-- CreateIndex
CREATE INDEX "FinancialModelRun_businessId_createdAt_idx" ON "FinancialModelRun"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialModelRun_userId_createdAt_idx" ON "FinancialModelRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialModelRun_modelId_businessId_idx" ON "FinancialModelRun"("modelId", "businessId");

-- CreateIndex
CREATE INDEX "FinancialModelRun_sourceDocumentId_idx" ON "FinancialModelRun"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "FinancialModelRun_caseId_idx" ON "FinancialModelRun"("caseId");

-- CreateIndex
CREATE INDEX "ModelAssumption_runId_idx" ON "ModelAssumption"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCase_code_key" ON "FinancialCase"("code");

-- CreateIndex
CREATE INDEX "FinancialCase_courseId_status_idx" ON "FinancialCase"("courseId", "status");

-- CreateIndex
CREATE INDEX "DecisionJournalEntry_businessId_createdAt_idx" ON "DecisionJournalEntry"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "DecisionJournalEntry_userId_reviewedAt_idx" ON "DecisionJournalEntry"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "DecisionJournalEntry_modelRunId_idx" ON "DecisionJournalEntry"("modelRunId");

-- AddForeignKey
ALTER TABLE "FinancialModelVersion" ADD CONSTRAINT "FinancialModelVersion_financialModelId_fkey" FOREIGN KEY ("financialModelId") REFERENCES "FinancialModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelRun" ADD CONSTRAINT "FinancialModelRun_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FinancialModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelRun" ADD CONSTRAINT "FinancialModelRun_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "FinancialModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelRun" ADD CONSTRAINT "FinancialModelRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelRun" ADD CONSTRAINT "FinancialModelRun_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelRun" ADD CONSTRAINT "FinancialModelRun_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelRun" ADD CONSTRAINT "FinancialModelRun_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FinancialCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAssumption" ADD CONSTRAINT "ModelAssumption_runId_fkey" FOREIGN KEY ("runId") REFERENCES "FinancialModelRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialCase" ADD CONSTRAINT "FinancialCase_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionJournalEntry" ADD CONSTRAINT "DecisionJournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionJournalEntry" ADD CONSTRAINT "DecisionJournalEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionJournalEntry" ADD CONSTRAINT "DecisionJournalEntry_modelRunId_fkey" FOREIGN KEY ("modelRunId") REFERENCES "FinancialModelRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialCaseModel" ADD CONSTRAINT "FinancialCaseModel_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FinancialCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialCaseModel" ADD CONSTRAINT "FinancialCaseModel_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FinancialModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelCourse" ADD CONSTRAINT "FinancialModelCourse_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FinancialModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelCourse" ADD CONSTRAINT "FinancialModelCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelKnowledgeObject" ADD CONSTRAINT "FinancialModelKnowledgeObject_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FinancialModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelKnowledgeObject" ADD CONSTRAINT "FinancialModelKnowledgeObject_koId_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelTaskTemplate" ADD CONSTRAINT "FinancialModelTaskTemplate_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FinancialModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialModelTaskTemplate" ADD CONSTRAINT "FinancialModelTaskTemplate_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
