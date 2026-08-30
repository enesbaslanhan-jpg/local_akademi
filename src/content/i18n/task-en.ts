const EXACT_SYSTEM_TASK_TITLES: Record<string, string> = {
  'Pazar Yeri Komisyonu: gerçek işletme kaydını oluştur': 'Marketplace Commission: Create a real business record',
  'Kâr ile Nakit Arasındaki Fark: gerçek işletme kaydını oluştur': 'The Difference Between Profit and Cash: Create a real business record',
}

const SYSTEM_TASK_SUFFIXES: Array<[string, string]> = [
  [': gerçek işletme kaydını oluştur', 'Create a real business record'],
  [': işletme karar dosyası', 'Create a business decision file'],
]

/**
 * Localize only canonical system-generated task titles. Anything else may be
 * user-authored content and must remain untouched.
 */
export function localizeSystemTaskTitle(title: string | null | undefined, language: 'tr' | 'en'): string {
  if (!title) return language === 'en' ? 'Complete the task' : 'Görevi tamamla'
  if (language !== 'en') return title

  const exact = EXACT_SYSTEM_TASK_TITLES[title]
  if (exact) return exact

  const suffix = SYSTEM_TASK_SUFFIXES.find(([source]) => title.endsWith(source))
  return suffix?.[1] ?? title
}
