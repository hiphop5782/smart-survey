// @vitest-environment node
import { webcrypto } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { decryptSurveyResponse, encryptSurveyResponse } from '../src/lib/submission/crypto'
import type { SurveyResponse } from '../src/domain/types'

let publicKeyPem = ''
let privateKeyPem = ''

function toPem(label: string, value: ArrayBuffer): string {
  const base64 = Buffer.from(value).toString('base64').match(/.{1,64}/g)?.join('\n') ?? ''
  return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----\n`
}

beforeAll(async () => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
  const pair = await webcrypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  )
  publicKeyPem = toPem('PUBLIC KEY', await webcrypto.subtle.exportKey('spki', pair.publicKey))
  privateKeyPem = toPem('PRIVATE KEY', await webcrypto.subtle.exportKey('pkcs8', pair.privateKey))
})

describe('encrypted response submission', () => {
  const response: SurveyResponse = {
    schemaVersion: 1,
    surveyId: 'python-course-2026',
    revision: 2,
    responseId: 'd830c85b-772d-41a8-af9b-51c6380458d8',
    submittedAt: '2026-10-23T01:02:03.000Z',
    answers: { experience: '처음입니다', stacks: ['python', 'git'], confidence: 3 },
  }

  it('round-trips Korean answers without exposing them in the envelope', async () => {
    const envelope = await encryptSurveyResponse(response, publicKeyPem)
    expect(JSON.stringify(envelope)).not.toContain('처음입니다')
    expect(envelope.encrypted).toBe(true)
    await expect(decryptSurveyResponse(envelope, privateKeyPem)).resolves.toEqual(response)
  })

  it('rejects metadata that does not match the encrypted payload', async () => {
    const envelope = await encryptSurveyResponse(response, publicKeyPem)
    envelope.revision = 3
    await expect(decryptSurveyResponse(envelope, privateKeyPem)).rejects.toThrow('일치하지 않습니다')
  })
})
