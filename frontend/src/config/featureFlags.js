export function readFeatureFlags(env = import.meta.env) {
  const enabled = (name, fallback = false) => {
    const value = env?.[name]
    if (value == null) return fallback
    return String(value).toLowerCase() === 'true'
  }

  return {
    legacyQuiz: enabled('VITE_FF_LEGACY_QUIZ', false),
    legacyFlashcards: enabled('VITE_FF_LEGACY_FLASHCARDS', false),
    decisionChecks: enabled('VITE_FF_DECISION_CHECKS', true),
    practicalCards: enabled('VITE_FF_PRACTICAL_CARDS', false),
  }
}

export const featureFlags = readFeatureFlags()
