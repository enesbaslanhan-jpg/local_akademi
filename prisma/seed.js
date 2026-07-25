"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
    const studentPassword = await bcryptjs_1.default.hash('student123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@localakademi.com' },
        update: {},
        create: {
            email: 'admin@localakademi.com',
            password: adminPassword,
            name: 'Admin User',
            role: 'admin'
        }
    });
    const student = await prisma.user.upsert({
        where: { email: 'student@localakademi.com' },
        update: {},
        create: {
            email: 'student@localakademi.com',
            password: studentPassword,
            name: 'Demo Student',
            role: 'student'
        }
    });
    const course1 = await prisma.course.upsert({
        where: { id: 1 },
        update: {},
        create: {
            title: 'Python Programlamaya Giriş',
            description: 'Python programlama dilini sıfırdan öğrenmeye başlayın',
            category: 'Programming',
            level: 'beginner',
            published: true
        }
    });
    await prisma.lesson.upsert({
        where: { id: 1 },
        update: {},
        create: {
            courseId: course1.id,
            title: 'Değişkenler ve Veri Tipleri',
            content: 'Python\'da değişkenler, verileri saklamak için kullanılan isimlendirilmiş bellek alanlarıdır.\n\nDeğişken tanımlama:\n```python\nname = "Ahmet"\nage = 25\nis_student = True\n```\n\nTemel veri tipleri:\n- str: Metin verileri\n- int: Tam sayılar\n- float: Ondalıklı sayılar\n- bool: True/False',
            order: 1
        }
    });
    await prisma.lesson.upsert({
        where: { id: 2 },
        update: {},
        create: {
            courseId: course1.id,
            title: 'Koşullu İfadeler',
            content: 'if, elif ve else ile koşullu mantık:\n\n```python\nage = 18\n\nif age >= 18:\n    print("Reşitsiniz")\nelif age >= 13:\n    print("Gençsiniz")\nelse:\n    print("Çocuksunuz")\n```',
            order: 2
        }
    });
    const course2 = await prisma.course.upsert({
        where: { id: 2 },
        update: {},
        create: {
            title: 'Web Geliştirme Temelleri',
            description: 'HTML, CSS ve JavaScript ile web sayfaları oluşturmayı öğrenin',
            category: 'Web Development',
            level: 'beginner',
            published: true
        }
    });
    await prisma.lesson.upsert({
        where: { id: 3 },
        update: {},
        create: {
            courseId: course2.id,
            title: 'HTML Temelleri',
            content: 'HTML (HyperText Markup Language) web sayfalarının yapısını oluşturur.\n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n    <title>İlk Sayfam</title>\n</head>\n<body>\n    <h1>Merhaba Dünya!</h1>\n</body>\n</html>\n```',
            order: 1
        }
    });
    const knowledgeObjects = [
        {
            type: 'concept',
            title: 'Değişken (Variable)',
            content: 'Bir değişken, programda veri saklamak için kullanılan isimlendirilmiş bir bellek alanıdır.',
            metadata: JSON.stringify({ field: 'Programming', difficulty: 'beginner' })
        },
        {
            type: 'concept',
            title: 'Fonksiyon (Function)',
            content: 'Fonksiyonlar, belirli bir görevi gerçekleştirmek için gruplandırılmış kod bloklarıdır.',
            metadata: JSON.stringify({ field: 'Programming', difficulty: 'intermediate' })
        },
        {
            type: 'procedure',
            title: 'Python\'da Değişken Oluşturma',
            content: '1. Değişken adını yazın\n2. = operatörünü koyun\n3. Değeri yazın\n\nÖrnek: name = "Ahmet"',
            metadata: JSON.stringify({ field: 'Python', difficulty: 'beginner' })
        },
        {
            type: 'fact',
            title: 'Python\'da len() fonksiyonu',
            content: 'len() fonksiyonu bir nesnenin uzunluğunu döndürür.',
            metadata: JSON.stringify({ language: 'Python', category: 'built-in-functions' })
        },
        {
            type: 'principle',
            title: 'DRY (Don\'t Repeat Yourself)',
            content: 'Her bilgi parçası sistemde yalnızca bir kez bulunmalıdır. Tekrar önlenmelidir.',
            metadata: JSON.stringify({ category: 'Software Engineering' })
        }
    ];
    for (const ko of knowledgeObjects) {
        await prisma.knowledgeObject.upsert({
            where: { id: knowledgeObjects.indexOf(ko) + 1 },
            update: {},
            create: { ...ko, embedding: '[]' }
        });
    }
    console.log('Seed data created:');
    console.log('- Admin:', admin.email);
    console.log('- Student:', student.email);
    console.log('- Courses:', course1.title, ',', course2.title);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map