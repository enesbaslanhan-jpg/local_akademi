const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Reverse relation in User
if (!schema.includes('practicalCardSaves')) {
  schema = schema.replace(/(\s+)(DecisionCheckSession\[\]\n\s*\})/, '$1DecisionCheckSession[]\n$1practicalCardSaves      PracticalCardSave[]\n$1practicalCardFeedbacks  PracticalCardFeedback[]\n}');
}

// Reverse relation in KnowledgeObject
if (!schema.includes('practicalCards')) {
  schema = schema.replace(/(\s+)(sources\s+KnowledgeObjectSource\[\]\n\s*\})/, '$1sources            KnowledgeObjectSource[]\n$1practicalCards     PracticalCardKnowledgeObject[]\n}');
}

const newModels = `
// ==========================================
// PHASE 8.0C - PRACTICAL CARDS
// ==========================================

model PracticalCard {
  id               String   @id @default(uuid())
  code             String   @unique
  title            String
  type             String
  shortDescription String?
  category         String?
  published        Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  versions         PracticalCardVersion[]
  knowledgeObjects PracticalCardKnowledgeObject[]
  saves            PracticalCardSave[]
  feedbacks        PracticalCardFeedback[]
}

model PracticalCardVersion {
  id              String   @id @default(uuid())
  practicalCardId String
  version         Int
  status          String   @default("draft")
  contentJson     Json
  createdAt       DateTime @default(now())

  practicalCard   PracticalCard @relation(fields: [practicalCardId], references: [id], onDelete: Cascade)

  @@unique([practicalCardId, version])
}

model PracticalCardKnowledgeObject {
  practicalCardId   String
  knowledgeObjectId Int
  order             Int      @default(0)

  practicalCard     PracticalCard   @relation(fields: [practicalCardId], references: [id], onDelete: Cascade)
  knowledgeObject   KnowledgeObject @relation(fields: [knowledgeObjectId], references: [id], onDelete: Cascade)

  @@id([practicalCardId, knowledgeObjectId])
}

model PracticalCardSave {
  id              String   @id @default(uuid())
  userId          Int
  practicalCardId String
  createdAt       DateTime @default(now())

  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  practicalCard   PracticalCard @relation(fields: [practicalCardId], references: [id], onDelete: Cascade)

  @@unique([userId, practicalCardId])
}

model PracticalCardFeedback {
  id              String   @id @default(uuid())
  userId          Int
  practicalCardId String
  value           String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  practicalCard   PracticalCard @relation(fields: [practicalCardId], references: [id], onDelete: Cascade)

  @@unique([userId, practicalCardId])
}
`;

fs.writeFileSync('prisma/schema.prisma', schema.trimEnd() + '\n' + newModels);
