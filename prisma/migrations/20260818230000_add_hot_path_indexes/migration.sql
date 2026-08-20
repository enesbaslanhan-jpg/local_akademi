-- Sicak sorgu yollarindaki eksik indeksler.
--
-- Gerekce: PostgreSQL'de yabanci anahtarlar MySQL'in aksine otomatik
-- indekslenmez. Asagidaki tablolarda FK uzerinden filtreleme + createdAt
-- siralamasi yapiliyordu ama hicbir indeks yoktu; her sorgu sequential scan.
--
-- Her indeks kodda gercek bir sorguya karsilik gelir:
--   ActivityEvent          learnerDashboard.ts:48   where userId / orderBy createdAt desc
--   Conversation           conversation.ts:288      where userId / orderBy lastMessageAt desc
--   ConversationMessage    conversation.ts:79,218   where conversationId / orderBy createdAt desc
--   FormulaCalculation     formulas.ts:518          where userId / orderBy createdAt desc
--   MentorSession          mentor.ts:304            where userId / orderBy updatedAt desc
--   QuizAttempt            learnerDashboard.ts:71   where userId / orderBy createdAt desc
--   QuizAttempt            learningPath.ts:289      where userId + koId in (...)
--   QuizQuestion           quiz-engine.ts:171       count where quizId

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_createdAt_idx" ON "ActivityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_userId_lastMessageAt_idx" ON "Conversation"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "FormulaCalculation_userId_createdAt_idx" ON "FormulaCalculation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MentorSession_userId_updatedAt_idx" ON "MentorSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_createdAt_idx" ON "QuizAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_koId_idx" ON "QuizAttempt"("userId", "koId");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");
