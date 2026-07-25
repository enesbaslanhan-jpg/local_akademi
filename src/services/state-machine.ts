const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['published', 'rejected'],
  published: ['archived', 'draft'],
  rejected: ['draft', 'in_review'],
  archived: ['draft']
}

const TERMINAL_STATUSES = new Set(['archived'])

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid status transition: ${from} -> ${to}`)
    this.name = 'InvalidTransitionError'
  }
}

export function enforceTransition(from: string, to: string): void {
  if (from === to) return
  const allowed = VALID_TRANSITIONS[from]
  if (!allowed) {
    throw new InvalidTransitionError(from, to)
  }
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to)
  }
}

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function getValidTransitions(fromStatus: string): string[] {
  return VALID_TRANSITIONS[fromStatus] || []
}

export function isTransitionValid(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = VALID_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}
