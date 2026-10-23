import { parseEncryptedSurveyResponse } from '../../domain/schema'
import type { EncryptedSurveyResponse } from '../../domain/types'

export interface SubmissionConfig {
  enabled: boolean
  turnstileSiteKey: string
  encryptionPublicKey: string
}

export interface SubmissionReceipt {
  ok: true
  verified: true
  responseId: string
  path: string
  sha: string
}

function apiRoot(): string {
  const configured = import.meta.env.VITE_SUBMISSION_API_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:8787' : 'https://smart-survey-api.smart-survey.workers.dev'
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(value.error || `응답 수집 API 오류 (${response.status})`)
  return value as T
}

export async function fetchSubmissionConfig(): Promise<SubmissionConfig> {
  const response = await fetch(`${apiRoot()}/v1/config`, { headers: { Accept: 'application/json' } })
  return readApiResponse<SubmissionConfig>(response)
}

export async function submitEncryptedResponse(envelope: EncryptedSurveyResponse, turnstileToken: string): Promise<SubmissionReceipt> {
  const response = await fetch(`${apiRoot()}/v1/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ turnstileToken, response: envelope }),
  })
  return readApiResponse<SubmissionReceipt>(response)
}

export async function fetchEncryptedResponses(surveyId: string): Promise<EncryptedSurveyResponse[]> {
  const response = await fetch(`${apiRoot()}/v1/responses?surveyId=${encodeURIComponent(surveyId)}`, { headers: { Accept: 'application/json' } })
  const value = await readApiResponse<{ files: Array<{ name: string; url: string }> }>(response)
  const responses: EncryptedSurveyResponse[] = []
  for (let offset = 0; offset < value.files.length; offset += 20) {
    const batch = value.files.slice(offset, offset + 20)
    const loaded = await Promise.all(batch.map(async (file) => {
      if (!file.url.startsWith('https://raw.githubusercontent.com/')) throw new Error(`허용되지 않은 응답 파일 주소: ${file.name}`)
      const fileResponse = await fetch(file.url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      if (!fileResponse.ok) throw new Error(`${file.name} 조회 실패 (${fileResponse.status})`)
      return parseEncryptedSurveyResponse(await fileResponse.json())
    }))
    responses.push(...loaded)
  }
  return responses
}
