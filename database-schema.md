# Veritabanı Şeması

## Mevcut Durum

### User Model
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String
  role      String   @default("student")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Planlanan Modeller

### Course (Kurs)
```prisma
model Course {
  id          Int      @id @default(autoincrement())
  title       String
  description String
  category    String
  level       String   // beginner, intermediate, advanced
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  published   Boolean  @default(false)
}
```

### Lesson (Ders)
```prisma
model Lesson {
  id          Int      @id @default(autoincrement())
  courseId    Int
  title       String
  content     String
  order       Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  course      Course   @relation(fields: [courseId], references: [id])
}
```

### Enrollment (Kayıt)
```prisma
model Enrollment {
  id        Int      @id @default(autoincrement())
  userId    Int
  courseId  Int
  progress  Int      @default(0)
  status    String   @default("not_started") // not_started, in_progress, completed
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
  course    Course   @relation(fields: [courseId], references: [id])
}
```

### KnowledgeObject (Bilgi Nesnesi)
```prisma
model KnowledgeObject {
  id          Int      @id @default(autoincrement())
  type        String   // concept, fact, procedure, principle
  title       String
  content     String
  embedding   String   // Vector embedding for semantic search
  metadata    String   // JSON metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### LearningPath (Öğrenme Yolu)
```prisma
model LearningPath {
  id        Int      @id @default(autoincrement())
  userId    Int
  title     String
  pathData  String   // JSON: ordered list of knowledge object IDs
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
}
```

### MentorSession (Mentor Oturumu)
```prisma
model MentorSession {
  id          Int      @id @default(autoincrement())
  userId      Int
  sessionId   String   @unique
  context     String   // JSON: conversation history
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])
}
```

## İlişkiler

```
User 1----< Enrollment
User 1----< LearningPath
User 1----< MentorSession
Course 1----< Lesson
Course 1----< Enrollment
```