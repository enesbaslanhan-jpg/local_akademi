function readBooleanFlag(name: string, defaultValue = false): boolean {
  const value = process.env[name]
  if (value === undefined) return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

export function isLegacyQuizEnabled(): boolean {
  return readBooleanFlag('FEATURE_LEGACY_QUIZ_ENABLED', false)
}

export function isLegacyFlashcardsEnabled(): boolean {
  return readBooleanFlag('FEATURE_LEGACY_FLASHCARDS_ENABLED', false)
}

export const LEGACY_QUIZ_DISABLED = {
  code: 'LEGACY_QUIZ_DISABLED',
  error: 'Quiz deneyimi kullanımdan kaldırıldı. Karar Kontrolleri ile devam edin.',
}

export const LEGACY_FLASHCARDS_DISABLED = {
  code: 'LEGACY_FLASHCARDS_DISABLED',
  error: 'Flashcard deneyimi kullanımdan kaldırıldı. Pratik Kartlar ile devam edin.',
}
