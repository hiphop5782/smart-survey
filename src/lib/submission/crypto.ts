import { parseSurveyResponse } from '../../domain/schema'
import type { EncryptedSurveyResponse, SurveyResponse } from '../../domain/types'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function pemToBytes(pem: string, label: 'PUBLIC KEY' | 'PRIVATE KEY'): Uint8Array<ArrayBuffer> {
  const normalized = pem.replaceAll(`-----BEGIN ${label}-----`, '').replaceAll(`-----END ${label}-----`, '').replace(/\s/g, '')
  if (!normalized) throw new Error(`${label === 'PUBLIC KEY' ? '공개키' : '개인키'} PEM 형식이 올바르지 않습니다.`)
  return base64ToBytes(normalized)
}

export async function encryptSurveyResponse(response: SurveyResponse, publicKeyPem: string): Promise<EncryptedSurveyResponse> {
  const publicKey = await crypto.subtle.importKey(
    'spki',
    pemToBytes(publicKeyPem, 'PUBLIC KEY'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  const contentKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, contentKey, encoder.encode(JSON.stringify(response)))
  const rawContentKey = await crypto.subtle.exportKey('raw', contentKey)
  const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawContentKey)

  return {
    schemaVersion: 1,
    surveyId: response.surveyId,
    revision: response.revision,
    responseId: response.responseId,
    submittedAt: response.submittedAt,
    encrypted: true,
    encryption: {
      algorithm: 'RSA-OAEP-256+A256GCM',
      encryptedKey: bytesToBase64(new Uint8Array(encryptedKey)),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    },
  }
}

export async function decryptSurveyResponse(envelope: EncryptedSurveyResponse, privateKeyPem: string): Promise<SurveyResponse> {
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(privateKeyPem, 'PRIVATE KEY'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt'],
  )
  const rawContentKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, base64ToBytes(envelope.encryption.encryptedKey))
  const contentKey = await crypto.subtle.importKey('raw', rawContentKey, { name: 'AES-GCM' }, false, ['decrypt'])
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(envelope.encryption.iv) },
    contentKey,
    base64ToBytes(envelope.encryption.ciphertext),
  )
  const response = parseSurveyResponse(JSON.parse(decoder.decode(plaintext)))
  if (response.responseId !== envelope.responseId || response.surveyId !== envelope.surveyId || response.revision !== envelope.revision || response.submittedAt !== envelope.submittedAt) {
    throw new Error('암호문 내부 응답 정보와 공개 메타데이터가 일치하지 않습니다.')
  }
  return response
}
