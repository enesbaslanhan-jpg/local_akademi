# <título>Knowledge Engine Hardening — Migration Plan</título>

<versão>v1.0 → v1.1.0</versão>
<data>2026-07-16</data>

---

## Fase 1: Demo Marking + Schema Hardening *(AGORA)*

### 1.1 KnowledgeObject — Novos campos

```sql
ALTER TABLE KnowledgeObject ADD COLUMN code TEXT;
ALTER TABLE KnowledgeObject ADD COLUMN slug TEXT;
ALTER TABLE KnowledgeObject ADD COLUMN status TEXT DEFAULT 'draft';
ALTER TABLE KnowledgeObject ADD COLUMN verificationStatus TEXT DEFAULT 'unverified';
ALTER TABLE KnowledgeObject ADD COLUMN reviewGate TEXT DEFAULT 'none';
ALTER TABLE KnowledgeObject ADD COLUMN isDemo INTEGER DEFAULT 0;
ALTER TABLE KnowledgeObject ADD COLUMN publishedAt TEXT;
ALTER TABLE KnowledgeObject ADD COLUMN archivedAt TEXT;
ALTER TABLE KnowledgeObject ADD COLUMN reviewDue TEXT;
ALTER TABLE KnowledgeObject ADD COLUMN currentVersionId INTEGER;
```

### 1.2 Preenche campos para 600 registros existentes

```sql
UPDATE KnowledgeObject SET
  code = 'DEMO-' || id,
  slug = 'demo-' || id || '-' || lower(replace(trim(title), ' ', '-')),
  isDemo = 1,
  status = 'draft',
  verificationStatus = 'unverified',
  reviewGate = 'none'
WHERE isDemo IS NULL OR isDemo = 0;
```

### 1.3 Unique indexes

```sql
CREATE UNIQUE INDEX idx_ko_code ON KnowledgeObject(code);
CREATE UNIQUE INDEX idx_ko_slug ON KnowledgeObject(slug);
```

---

## Fase 2: Novos Modelos (schedule: após Fase 1 testada)

### 2.1 Modelos a criar

| Modelo | PK | FK | Notas |
|--------|-----|-----|-------|
| Category | id Int auto | – | KO.categoryId FK adicionado depois |
| KnowledgeObjectVersion | id Int auto | koId → KO | versionNumber, changes, createdBy |
| Source | id String uuid | – | title, url, authorityLevel, lastChecked |
| KnowledgeObjectSource | id String | koId, sourceId FK | M:N bridge |
| ReviewRecord | id String uuid | koId, reviewerId FK | status, notes, reviewedAt |
| Quiz | id String | koId FK | title, passScore |
| QuizQuestion | id String | quizId FK | question, options, correctAnswer |
| TaskTemplate | id String uuid | koId FK | title, description, estimatedTime |
| Formula | id String | – | name, formulaText, inputs, outputs |
| PublicationEvent | id String uuid | koId FK | action, performedBy, timestamp |
| ImportJob | id String uuid | – | status, totalRows, processedAt |
| ImportJobError | id Int auto | importJobId FK | row, field, message |

### 2.2 KnowledgeObject → Category FK

Depois que Category existir:

```sql
ALTER TABLE KnowledgeObject ADD COLUMN categoryId INTEGER REFERENCES Category(id);
```

Migrar:

```sql
UPDATE KnowledgeObject SET categoryId = c.id
FROM Category c
WHERE json_extract(KnowledgeObject.metadata, '$.category') = c.name;
```

---

## Fase 3: Service + Import *(schedule: após Fase 2)*

### 3.1 knowledge.ts → suporte a code

```typescript
// Antes: where: { id: parseInt(id) }
// Depois: where: { OR: [{ id: parseInt(id) }, { code: id }] }
```

### 3.2 JSON import endpoint

- `POST /knowledge/import` (dry-run ve commit modu)
- Validacao schema
- Duplicate code kontrolu
- Log ImportJob + ImportJobError

---

---

## Sequência de Execução

```
[HOJE] Fase 1 – adicionar campos ao KO
  ├── schema.prisma edit
  ├── npx prisma db push
  ├── script demo-mark.ts
  └── ✅ Testar KO listing
       ✅ KO search funcional
       ✅ isDemo field populado
       ✅ Nenhum dado perdido

[AMANHÃ] Fase 2 – novos modelos
  ├── schema.prisma: Category, Source, etc
  ├── npx prisma db push
  └── ✅ Testar cadamodelo
  
[SONRA] Fase 3 – service update + import
```

---

## Risco de rollback

| Situação | Procedimento |
|----------|-------------|
| db push falha | Restaurar BACKUP_dev.db |
| KO search quebra | Verificar indice unique |
| isDemo non-set | Rodar script novamente (idempotent) |

---

*(Migration plan ready – proceed to Phase 1)* tintine-cursorselecion-design-system  "Registered",
—