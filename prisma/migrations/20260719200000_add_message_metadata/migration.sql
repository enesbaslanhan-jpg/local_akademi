-- Add generationStatus, regeneratedFromMessageId, editedFromMessageId to ConversationMessage

ALTER TABLE "ConversationMessage" ADD COLUMN "generationStatus" TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE "ConversationMessage" ADD COLUMN "regeneratedFromMessageId" INTEGER REFERENCES "ConversationMessage"("id") ON DELETE SET NULL;
ALTER TABLE "ConversationMessage" ADD COLUMN "editedFromMessageId" INTEGER REFERENCES "ConversationMessage"("id") ON DELETE SET NULL;
