// Termora mobile companion — phase 1 secure-storage abstraction.
//
// Pure TypeScript: this is the interface the native shell will implement with
// expo-secure-store (or Keychain/Keystore). It deliberately declares no native
// dependency so tests and typechecks run without an Expo runtime. The in-memory
// implementation exists for tests and for honest "not wired yet" states.

/** Storage slots the companion is allowed to persist. Tokens never touch logs. */
export const SECURE_STORAGE_KEYS = {
  sessionJwt: 'termora.session.jwt',
  deviceToken: 'termora.device.token',
  pairing: 'termora.pairing',
} as const

export type SecureStorageKey = (typeof SECURE_STORAGE_KEYS)[keyof typeof SECURE_STORAGE_KEYS]

/** Minimal async key/value contract the native shell must satisfy. */
export interface SecureStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}

/**
 * In-memory implementation. Intended for tests and for the gated scaffold: it
 * proves the contract shape without claiming a real secure enclave exists.
 */
export function createMemorySecureStorage(seed: Record<string, string> = {}): SecureStorage {
  const store = new Map<string, string>(Object.entries(seed))
  return {
    async get(key) {
      return store.has(key) ? (store.get(key) as string) : null
    },
    async set(key, value) {
      store.set(key, value)
    },
    async delete(key) {
      store.delete(key)
    },
    async keys() {
      return [...store.keys()].sort()
    },
  }
}

/**
 * Persists a value only when it is a non-empty string. Returns whether a write
 * happened, so callers cannot silently store an empty or malformed secret.
 */
export async function putSecret(
  storage: SecureStorage,
  key: string,
  value: string,
): Promise<boolean> {
  if (value.length === 0) return false
  await storage.set(key, value)
  return true
}

/** Reads a secret and treats empty strings as absent. */
export async function getSecret(storage: SecureStorage, key: string): Promise<string | null> {
  const value = await storage.get(key)
  return value && value.length > 0 ? value : null
}

/** Removes every companion secret; used on unpair/sign-out. */
export async function clearCompanionSecrets(storage: SecureStorage): Promise<void> {
  for (const key of Object.values(SECURE_STORAGE_KEYS)) {
    await storage.delete(key)
  }
}
