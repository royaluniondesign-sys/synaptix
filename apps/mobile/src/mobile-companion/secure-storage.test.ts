import { describe, it, expect } from 'vitest'
import {
  SECURE_STORAGE_KEYS,
  clearCompanionSecrets,
  createMemorySecureStorage,
  getSecret,
  putSecret,
} from './secure-storage.js'

describe('createMemorySecureStorage', () => {
  it('sets, reads, and deletes values', async () => {
    const storage = createMemorySecureStorage()
    await storage.set('a', '1')
    expect(await storage.get('a')).toBe('1')
    expect(await storage.get('missing')).toBeNull()
    await storage.delete('a')
    expect(await storage.get('a')).toBeNull()
  })

  it('seeds from an initial record without aliasing the input', async () => {
    const seed = { seed: 'value' }
    const storage = createMemorySecureStorage(seed)
    seed.seed = 'mutated'
    expect(await storage.get('seed')).toBe('value')
  })

  it('sorts keys deterministically', async () => {
    const storage = createMemorySecureStorage({ b: '1', a: '2' })
    expect(await storage.keys()).toEqual(['a', 'b'])
  })
})

describe('putSecret', () => {
  it('refuses to store empty values', async () => {
    const storage = createMemorySecureStorage()
    expect(await putSecret(storage, 'k', '')).toBe(false)
    expect(await storage.get('k')).toBeNull()
    expect(await putSecret(storage, 'k', 'v')).toBe(true)
    expect(await storage.get('k')).toBe('v')
  })
})

describe('getSecret', () => {
  it('treats an empty stored value as absent', async () => {
    const storage = createMemorySecureStorage({ k: '' })
    expect(await getSecret(storage, 'k')).toBeNull()
  })
})

describe('clearCompanionSecrets', () => {
  it('removes all companion slots but leaves unrelated keys', async () => {
    const storage = createMemorySecureStorage({
      [SECURE_STORAGE_KEYS.sessionJwt]: 'jwt',
      [SECURE_STORAGE_KEYS.deviceToken]: 'token',
      [SECURE_STORAGE_KEYS.pairing]: 'pairing',
      unrelated: 'keep',
    })
    await clearCompanionSecrets(storage)
    expect(await storage.keys()).toEqual(['unrelated'])
  })
})
