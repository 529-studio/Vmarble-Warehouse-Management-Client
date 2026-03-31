const BEARER_PREFIX_REGEX = /^Bearer\s+/i

export function normalizeAuthToken(token: string | null | undefined): string | null {
  if (!token) return null
  const trimmed = token.trim()
  if (!trimmed) return null
  return trimmed.replace(BEARER_PREFIX_REGEX, '')
}
