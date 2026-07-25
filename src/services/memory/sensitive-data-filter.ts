import { maskSensitiveData } from '../sensitive-data-masker'

export function containsSensitiveData(text: string): boolean {
  const masked = maskSensitiveData(text)
  return masked !== text
}

export function isAllowedMemoryValue(value: string): boolean {
  if (value.length > 10000) return false
  if (containsSensitiveData(value)) return false
  return true
}
