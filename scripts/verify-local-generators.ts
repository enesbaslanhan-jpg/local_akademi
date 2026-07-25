import { generateQuizDraft } from '../src/services/quiz-generator'
import { generateOfficialSummary } from '../src/services/official-update-summarizer'

async function main(): Promise<void> {
  const quiz = await generateQuizDraft({
      code: 'VERIFY-LOCAL',
      title: 'Nakit Akışı Temelleri',
      content:
        'Nakit akışı, belirli bir dönemde işletmeye giren ve işletmeden çıkan nakdin izlenmesidir. Pozitif nakit akışı, nakit girişlerinin çıkışlardan fazla olmasıdır. Tahsilat ve ödeme tarihleri haftalık tabloda izlenebilir.',
    })
  const official = await generateOfficialSummary({
      sourceTitle: 'Örnek Resmî Kurum',
      sourceUrl: 'https://example.gov.tr/duyuru',
      sourceText:
        'Örnek Resmî Kurum, küçük işletmelere yönelik eğitim programı başvurularının 1 Ağustos tarihinde başlayacağını duyurdu. Başvurular 15 Ağustos tarihine kadar kurumun resmî çevrim içi sistemi üzerinden alınacak. Programa katılım koşulları ve gerekli belgeler duyuru sayfasında yayımlandı. Başvuru sahiplerinin bilgileri resmî sayfadan kontrol etmesi gerekiyor.',
    })

  console.log(
    JSON.stringify({
      ok: true,
      quiz: {
        questionCount: quiz.questions.length,
        passScore: quiz.passScore,
        allAnswersInOptions: quiz.questions.every(
          question =>
            question.options.filter(
              option => option === question.correctAnswer,
            ).length === 1,
        ),
      },
      officialSummary: {
        titleChars: official.title.length,
        summaryChars: official.summary.length,
      },
      databaseWrites: 0,
      contentStoredInReport: false,
    }),
  )
}

main().catch(error => {
  console.error(
    JSON.stringify({
      ok: false,
      errorCode:
        error instanceof Error
          ? error.message
          : 'LOCAL_GENERATOR_VERIFICATION_FAILED',
    }),
  )
  process.exitCode = 1
})
