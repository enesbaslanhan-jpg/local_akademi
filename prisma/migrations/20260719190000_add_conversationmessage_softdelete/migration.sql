-- AlterTable: Add new fields to Conversation
ALTER TABLE "Conversation" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Conversation" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Conversation" ADD COLUMN "lastMessageAt" DATETIME;
ALTER TABLE "Conversation" ADD COLUMN "model" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "provider" TEXT;

-- RenameTable: Message → ConversationMessage
ALTER TABLE "Message" RENAME TO "ConversationMessage";

-- AlterTable: Add new fields to ConversationMessage
ALTER TABLE "ConversationMessage" ADD COLUMN "citations" TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "knowledgeObjects" TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "toolCalls" TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "tokenUsage" TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "error" TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop old sources column
ALTER TABLE "ConversationMessage" DROP COLUMN "sources";
