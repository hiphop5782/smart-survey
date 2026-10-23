// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isEncryptedResponse } from '../worker/src/index'

describe('worker encrypted response validation', () => {
  const valid = {
    schemaVersion: 1,
    surveyId: 'python-course-2026',
    revision: 1,
    responseId: 'd830c85b-772d-41a8-af9b-51c6380458d8',
    submittedAt: '2026-10-23T01:02:03.000Z',
    encrypted: true,
    encryption: {
      algorithm: 'RSA-OAEP-256+A256GCM',
      encryptedKey: 'A'.repeat(344),
      iv: 'A'.repeat(16),
      ciphertext: 'A'.repeat(40),
    },
  }

  it('accepts the encrypted envelope and rejects added plaintext fields', () => {
    expect(isEncryptedResponse(valid)).toBe(true)
    expect(isEncryptedResponse({ ...valid, answers: { name: 'student' } })).toBe(false)
  })

  it('rejects invalid ids and algorithms', () => {
    expect(isEncryptedResponse({ ...valid, responseId: '../secret' })).toBe(false)
    expect(isEncryptedResponse({ ...valid, encryption: { ...valid.encryption, algorithm: 'plain' } })).toBe(false)
  })
})
