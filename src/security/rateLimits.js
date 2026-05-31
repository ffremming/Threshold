const STORAGE_PREFIX = 'threshold:security:v1:'

const memoryStore = new Map()

const AUTH_LIMITS = {
  login: {
    global: { limit: 20, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 },
    identity: { limit: 5, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 },
  },
  register: {
    global: { limit: 8, windowMs: 60 * 60 * 1000, lockoutMs: 60 * 60 * 1000 },
    identity: { limit: 3, windowMs: 60 * 60 * 1000, lockoutMs: 60 * 60 * 1000 },
  },
}

const DEFAULT_DATABASE_LIMIT = {
  limit: 45,
  windowMs: 60 * 1000,
  cooldownMs: 250,
  lockoutMs: 60 * 1000,
}

const DATABASE_LIMITS = {
  relationships: { limit: 20, windowMs: 60 * 1000, cooldownMs: 500, lockoutMs: 60 * 1000 },
  users: { limit: 20, windowMs: 60 * 1000, cooldownMs: 500, lockoutMs: 60 * 1000 },
  'global-templates': { limit: 20, windowMs: 60 * 1000, cooldownMs: 500, lockoutMs: 60 * 1000 },
}

export class RateLimitError extends Error {
  constructor(message, retryAfterMs) {
    super(message)
    this.name = 'RateLimitError'
    this.code = 'rate-limited'
    this.retryAfterMs = retryAfterMs
  }
}

export function isRateLimitError(error) {
  return error?.code === 'rate-limited' || error instanceof RateLimitError
}

function canUseLocalStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    const key = `${STORAGE_PREFIX}probe`
    window.localStorage.setItem(key, '1')
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

const hasLocalStorage = canUseLocalStorage()

function storageKey(scope) {
  return `${STORAGE_PREFIX}${scope}`
}

function readBucket(scope) {
  const key = storageKey(scope)
  if (!hasLocalStorage) return memoryStore.get(key) || {}

  try {
    return JSON.parse(window.localStorage.getItem(key)) || {}
  } catch {
    return {}
  }
}

function writeBucket(scope, bucket) {
  const key = storageKey(scope)
  if (!hasLocalStorage) {
    memoryStore.set(key, bucket)
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(bucket))
  } catch {
    memoryStore.set(key, bucket)
  }
}

function removeBucket(scope) {
  const key = storageKey(scope)
  memoryStore.delete(key)
  if (!hasLocalStorage) return

  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage cleanup failures. The in-memory fallback is already clear.
  }
}

function normalizeIdentity(value) {
  return encodeURIComponent(String(value || 'anonymous').trim().toLowerCase())
}

function normalizeBucket(bucket, now, windowMs) {
  const events = Array.isArray(bucket.events)
    ? bucket.events.filter(ts => Number.isFinite(ts) && now - ts < windowMs)
    : []

  return {
    events,
    lockedUntil: Number.isFinite(bucket.lockedUntil) ? bucket.lockedUntil : 0,
    lastAt: Number.isFinite(bucket.lastAt) ? bucket.lastAt : 0,
  }
}

function formatDuration(ms) {
  const seconds = Math.max(1, Math.ceil(ms / 1000))
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`

  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`

  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

function reserveSlot(scope, options) {
  const now = Date.now()
  const {
    limit,
    windowMs,
    cooldownMs = 0,
    lockoutMs = windowMs,
  } = options
  const bucket = normalizeBucket(readBucket(scope), now, windowMs)

  if (bucket.lockedUntil > now) {
    const retryAfterMs = bucket.lockedUntil - now
    throw new RateLimitError(`Too many attempts. Try again in ${formatDuration(retryAfterMs)}.`, retryAfterMs)
  }

  if (cooldownMs > 0 && bucket.lastAt && now - bucket.lastAt < cooldownMs) {
    const retryAfterMs = cooldownMs - (now - bucket.lastAt)
    throw new RateLimitError(`Please wait ${formatDuration(retryAfterMs)} before trying again.`, retryAfterMs)
  }

  if (bucket.events.length >= limit) {
    const retryAfterMs = lockoutMs || Math.max(1000, windowMs - (now - bucket.events[0]))
    bucket.lockedUntil = now + retryAfterMs
    writeBucket(scope, bucket)
    throw new RateLimitError(`Too many attempts. Try again in ${formatDuration(retryAfterMs)}.`, retryAfterMs)
  }

  bucket.events.push(now)
  bucket.lastAt = now
  writeBucket(scope, bucket)
}

export function assertAuthAttemptAllowed(action, identity) {
  const limits = AUTH_LIMITS[action] || AUTH_LIMITS.login
  reserveSlot(`auth:${action}:global`, limits.global)
  reserveSlot(`auth:${action}:identity:${normalizeIdentity(identity)}`, limits.identity)
}

export function clearAuthAttempts(action, identity) {
  removeBucket(`auth:${action}:identity:${normalizeIdentity(identity)}`)
}

export function assertDatabaseWriteAllowed(scope) {
  reserveSlot(`db:${scope}`, DATABASE_LIMITS[scope] || DEFAULT_DATABASE_LIMIT)
}

export async function withDatabaseWriteLimit(scope, operation) {
  assertDatabaseWriteAllowed(scope)
  return operation()
}
