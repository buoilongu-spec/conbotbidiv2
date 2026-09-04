export type GeminiKeyStatus = 'ready' | 'quota' | 'invalid'

export interface GeminiApiKey {
  id: string
  label: string
  secret: string
  enabled: boolean
  remember: boolean
  status: GeminiKeyStatus
}

export interface GeminiSettings {
  model: string
  activeKeyId: string | null
  keys: GeminiApiKey[]
}

export const GEMINI_MODELS = [
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Cân bằng tốc độ và chất lượng, phù hợp hầu hết tác vụ.',
  },
  {
    value: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    description: 'Mô hình Flash ổn định mới nhất cho suy luận đa phương thức.',
  },
  {
    value: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash-Lite',
    description: 'Nhanh và tiết kiệm cho xử lý nhiều đề.',
  },
] as const

export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0].value

const SESSION_KEY = 'tsa-gemini-settings-session-v2'
const REMEMBERED_KEY = 'tsa-gemini-settings-remembered-v2'
const MODEL_KEY = 'tsa-gemini-model'

function parseKeys(value: string | null): GeminiApiKey[] {
  if (!value) return []
  try {
    const keys = JSON.parse(value) as GeminiApiKey[]
    return Array.isArray(keys) ? keys.filter((key) => key.id && key.secret) : []
  } catch {
    return []
  }
}

export function loadGeminiSettings(): GeminiSettings {
  const sessionKeys = parseKeys(sessionStorage.getItem(SESSION_KEY))
  const rememberedKeys = parseKeys(localStorage.getItem(REMEMBERED_KEY))
  const merged = new Map(rememberedKeys.map((key) => [key.id, key]))
  sessionKeys.forEach((key) => merged.set(key.id, key))

  const legacyRemembered = localStorage.getItem('tsa-gemini-key-remembered')
  const legacySession = sessionStorage.getItem('tsa-gemini-key-session')
  const legacySecret = legacyRemembered ?? legacySession
  if (!merged.size && legacySecret) {
    const migrated: GeminiApiKey = { id: crypto.randomUUID(), label: 'Key đã lưu', secret: legacySecret, enabled: true, remember: Boolean(legacyRemembered), status: 'ready' }
    merged.set(migrated.id, migrated)
    localStorage.removeItem('tsa-gemini-key-remembered')
    sessionStorage.removeItem('tsa-gemini-key-session')
  }

  const keys = Array.from(merged.values())
  const preferredActive = sessionStorage.getItem(`${SESSION_KEY}-active`)
  const activeKeyId = keys.some((key) => key.id === preferredActive)
    ? preferredActive
    : keys.find((key) => key.enabled)?.id ?? null

  return {
    model: localStorage.getItem(MODEL_KEY) ?? DEFAULT_GEMINI_MODEL,
    activeKeyId,
    keys,
  }
}

export function saveGeminiSettings(settings: GeminiSettings) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(settings.keys))
  sessionStorage.setItem(`${SESSION_KEY}-active`, settings.activeKeyId ?? '')
  localStorage.setItem(MODEL_KEY, settings.model)

  const rememberedKeys = settings.keys.filter((key) => key.remember)
  if (rememberedKeys.length) localStorage.setItem(REMEMBERED_KEY, JSON.stringify(rememberedKeys))
  else localStorage.removeItem(REMEMBERED_KEY)
}

export function maskGeminiKey(secret: string) {
  if (secret.length < 10) return '••••••••'
  return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`
}
