# Changelog – LocalAkademi

## [v1.1.0] – Knowledge Engine Hardening (Em andamento)

### Adicionado / Planejado
- `KnowledgeObject.code` (String unique) – Profesyonel KO kimligi (FIN-BREAKEVEN-001)
- `KnowledgeObject.slug` (String unique) – URL-friendly referans
- `KnowledgeObject.status` – draft | review | published | archived
- `KnowledgeObject.verificationStatus` – unverified | expert_review | verified
- `KnowledgeObject.reviewGate` – none | periodic | requires_document | requires_professional
- `KnowledgeObject.isDemo` (Boolean) – 600 otomatik KO'yu demo olarak isaretler
- `KnowledgeObject.publishedAt` (DateTime?) – Yayin tarihi
- `KnowledgeObject.archivedAt` (DateTime?) – Arsiv tarihi
- `KnowledgeObject.reviewDue` (DateTime?) – Gozden gecirme son tarihi
- Model: `Category`
- Model: `KnowledgeObjectVersion`
- Model: `Source`
- Model: `KnowledgeObjectSource`
- Model: `ReviewRecord`
- Model: `Quiz` (master)
- Model: `QuizQuestion`
- Model: `TaskTemplate`
- Model: `Formula` (master)
- Model: `PublicationEvent`
- Model: `ImportJob`
- Model: `ImportJobError`

### Duzeltildi / Planlandi
- Mevcut 600 KO `isDemo = true` olarak isaretlenecek
- Demo KO'lar profesyonel icerik gibi goruntulenmeyecek
- Kaynagi olmayan icerik published yapilamayacak
- Hukuk/vergi/IK review gate'li icerikler uzman onayi olmadan yayinlanamayacak

### Guvenlik (Planlanan – sonraki faz)
- JWT secret kontrol – varsayilan secret ile production baslatilamaz
- Token expiry ekle
- Rate limit
- Zod request validation
- Parola politikasi (min uzunluk)
- Email normalize et
- CORS guvenli yapilandirma
- Production sifrelerini kaldir (admin123 vb)

### AI Mentor (Planlanan – sonraki faz)
- Feature flag: AI_MENTOR_ENABLED (varsayilan: false)
- Session userId dogrulamasi
- Mesaj uzunlugu siniri
- Konusma gecmisi son N mesaj siniri
- NVIDIA hata detaylarini kullaniciya gosterme
- RAG yoksa "Genel AI Asistan" olarak goster

### Altyapi (Planlanan – sonraki faz)
- Dockerfile multi-stage build
- Prisma migration gecmisi
- Test suite: auth, rol, course CRUD, enrollment ownership, mentor session ownership, KO import

---

## [v1.0.0] – 2026-07-16

### Ilk surum
- Node.js + Fastify + Prisma + SQLite backend
- React + Vite frontend (test paneli)
- Auth: register, login, JWT
- Courses + Lessons CRUD
- Enrollments + progress tracking
- Knowledge Objects (600 adet otomatik uretim)
- AI Mentor chat (NVIDIA API ready)
- Learning Paths
- Quiz system
- Task assignments
- Document upload + Q&A
- Business profile + Dashboard
- Formula calculations
- Reports (PDF/Excel)
- System backup (ZIP)
- Admin panel
- Docker compose
- 15 Prisma model