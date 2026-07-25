# Knowledge Object Veri Modeli

## Genel Bakış

Knowledge Object (Bilgi Nesnesi), LocalAkademi platformunun temel bilgi birimidir. Her bir bilgi nesnesi, öğrencinin öğrenme sürecinde tüketebileceği atomik bir bilgi parçasını temsil eder.

## Veri Modeli

### KnowledgeObject

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | Int | Benzersiz tanımlayıcı |
| type | String | Nesne türü |
| title | String | Başlık |
| content | String | Ana içerik |
| embedding | String | Vektör gösterim (semantic search için) |
| metadata | String | JSON formatında ek veriler |
| createdAt | DateTime | Oluşturulma zamanı |
| updatedAt | DateTime | Güncellenme zamanı |

## Nesne Türleri

### 1. Concept (Kavram)
Bir fikir veya konsepti açıklar. Tanım, örnekler ve açıklamalar içerir.

```json
{
  "type": "concept",
  "title": "Recursion (Özyineleme)",
  "content": "Bir fonksiyonun kendisini çağırmasıdır. Base case ve recursive case olmak üzere iki bölümden oluşur.",
  "metadata": {
    "field": "Computer Science",
    "prerequisites": ["function", "stack"],
    "difficulty": "intermediate"
  }
}
```

### 2. Fact (Gerçek/Bilgi)
Doğrulabilir, atomik bilgi parçası. Tarihler, formüller, tanımlar bu kategoride yer alır.

```json
{
  "type": "fact",
  "title": "Python'da len() fonksiyonu",
  "content": "len() fonksiyonu bir nesnenin uzunluğunu döndürür.",
  "metadata": {
    "language": "Python",
    "category": "built-in-functions"
  }
}
```

### 3. Procedure (Prosedür)
Adım adım bir görevin nasıl yapılacağını açıklayan talimat dizisi.

```json
{
  "type": "procedure",
  "title": "Git commit oluşturma",
  "content": "1. git add . \n2. git commit -m 'mesaj' \n3. git push",
  "metadata": {
    "tool": "Git",
    "steps": 3
  }
}
```

### 4. Principle (İlke/Prensip)
Genel olarak uygulanabilir, temel kurallar veya kılavuzlar.

```json
{
  "type": "principle",
  "title": "DRY (Don't Repeat Yourself)",
  "content": "Her bilgi parçası sistemde yalnızca bir kez bulunmalıdır. Tekrar önlenmelidir.",
  "metadata": {
    "category": "Software Engineering",
    "origin": "The Pragmatic Programmer"
  }
}
```

## Metadata Yapısı

```json
{
  "field": "Computer Science",        // Alan/Disiplin
  "category": "Algorithms",            // Kategori
  "subcategory": "Sorting",            // Alt kategori
  "prerequisites": [1, 2, 3],         // Ön koşul knowledge object ID'leri
  "difficulty": "beginner",            // Zorluk seviyesi
  "tags": ["sorting", "comparison"],   // Etiketler
  "language": "Python",                 // Programlama dili (varsa)
  "source": "Stanford CS101",          // Kaynak
  "confidence": 0.95,                  // Güven skoru
  "usageCount": 1250,                  // Kullanım sayısı
  "successRate": 0.87                  // Başarı oranı
}
```

## Mevcut Depolama Konumu

Knowledge Object'ler şu anda **henüz veritabanında saklanmamaktadır**. Planlanan yapı:

- **Prisma Model:** `server/prisma/schema.prisma` içinde `KnowledgeObject` modeli tanımlanacak
- **Vektör Embedding:** `embedding` alanında JSON olarak saklanacak (üretimde pgvector veya Pinecone kullanılabilir)
- **Seed Data:** `server/prisma/seed.ts` içinde örnek knowledge object'ler olacak

## Semantic Search

Knowledge object'ler semantic search için vektör embedding kullanır. Her nesne oluşturulduğunda veya güncellendiğinde:

1. İçerik AI modeli tarafından embedding'e dönüştürülür
2. Embedding, arama altyapısında indekslenir
3. Öğrenci sorguları bu embedding uzayında eşleştirilir

## Örnek Kullanım

```typescript
// Yeni knowledge object oluşturma
const ko = await prisma.knowledgeObject.create({
  data: {
    type: 'concept',
    title: 'Variables',
    content: 'Değişkenler, verileri saklamak için kullanılan isimlendirilmiş bellek alanlarıdır.',
    metadata: JSON.stringify({
      field: 'Programming',
      difficulty: 'beginner'
    })
  }
})
```