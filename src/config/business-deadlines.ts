// Sources checked 2026-09-10. Extensions and special taxpayer rules are not
// inferred. The user confirms the first deadline against the official calendar.
export const DEADLINE_SOURCES = {
  checkedAt: '2026-09-10',
  tax: 'https://gib.gov.tr/vergi-takvimi',
  sgk: 'https://sgk.gov.tr/Content/Post/1f3a8bec-bca6-4e83-8e5c-f957a7d28af4/Isverenlerin-Prim-Odeme-Islemleri-2025-02-06-03-29-17',
  notice: 'Planlama hatırlatmasıdır. Tarihi GİB’den; SGK ve Bağ-Kur ödemelerini SGK’dan teyit edin. Süre uzatımları ve tatiller tarihi değiştirebilir.'
} as const
export const RENEWAL_TEMPLATES = ['tax_certificate', 'business_license', 'vehicle_inspection', 'insurance', 'comprehensive_insurance'] as const
export const RENEWAL_LABELS: Record<typeof RENEWAL_TEMPLATES[number], string> = {
  tax_certificate: 'Vergi levhası kontrolü', business_license: 'İşyeri ruhsatı kontrolü', vehicle_inspection: 'Araç muayenesi',
  insurance: 'Sigorta yenileme', comprehensive_insurance: 'Kasko yenileme'
}
