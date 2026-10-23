interface Env {
  GITHUB_OWNER: string
  GITHUB_REPOSITORY: string
  DATA_BRANCH: string
  ALLOWED_ORIGINS: string
  TURNSTILE_SITE_KEY: string
  TURNSTILE_SECRET_KEY: string
  RESPONSE_PUBLIC_KEY_PEM: string
  GITHUB_APP_ID: string
  GITHUB_APP_INSTALLATION_ID: string
  GITHUB_APP_PRIVATE_KEY: string
}

interface EncryptedResponse {
  schemaVersion: 1
  surveyId: string
  revision: number
  responseId: string
  submittedAt: string
  encrypted: true
  encryption: {
    algorithm: 'RSA-OAEP-256+A256GCM'
    encryptedKey: string
    iv: string
    ciphertext: string
  }
}

interface GitHubContent {
  type: 'file' | 'dir'
  name: string
  path: string
  sha: string
  content?: string
  encoding?: string
  download_url?: string
}

const MAX_BODY_BYTES = 160_000
let cachedInstallationToken: { value: string; expiresAt: number } | undefined

function isConfigured(env: Env): boolean {
  return Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && env.RESPONSE_PUBLIC_KEY_PEM && env.GITHUB_APP_ID && env.GITHUB_APP_INSTALLATION_ID && env.GITHUB_APP_PRIVATE_KEY)
}

function json(value: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin')
  if (!origin) return null
  const allowed = env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean)
  return allowed.includes(origin) ? origin : null
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function utf8Base64(value: string): string {
  let binary = ''
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new TextDecoder().decode(bytes)
}

function pemBytes(value: string): ArrayBuffer {
  const normalized = value.replaceAll('\\n', '\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}

async function createAppJwt(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: env.GITHUB_APP_ID })))
  const unsigned = `${header}.${payload}`
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(env.GITHUB_APP_PRIVATE_KEY), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`
}

async function installationToken(env: Env): Promise<string> {
  if (cachedInstallationToken && cachedInstallationToken.expiresAt > Date.now() + 60_000) return cachedInstallationToken.value
  const response = await fetch(`https://api.github.com/app/installations/${env.GITHUB_APP_INSTALLATION_ID}/access_tokens`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${await createAppJwt(env)}`,
      'User-Agent': 'smart-survey-worker',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) throw new Error(`GitHub App 인증 실패 (${response.status})`)
  const value = await response.json() as { token: string; expires_at: string }
  cachedInstallationToken = { value: value.token, expiresAt: new Date(value.expires_at).getTime() }
  return value.token
}

async function github(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const token = await installationToken(env)
  return fetch(`https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPOSITORY)}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'smart-survey-worker',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
  })
}

async function readGitHubJson(env: Env, path: string): Promise<{ value: unknown; sha: string } | null> {
  const response = await github(env, `/contents/${path}?ref=${encodeURIComponent(env.DATA_BRANCH)}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub 파일 조회 실패 (${response.status})`)
  const content = await response.json() as GitHubContent
  if (content.type !== 'file' || !content.content) throw new Error('GitHub 파일 응답 형식이 올바르지 않습니다.')
  return { value: JSON.parse(decodeBase64Utf8(content.content)), sha: content.sha }
}

export function isEncryptedResponse(value: unknown): value is EncryptedResponse {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  const encryption = item.encryption as Record<string, unknown> | undefined
  const topLevelKeys = Object.keys(item).sort().join(',')
  const encryptionKeys = encryption ? Object.keys(encryption).sort().join(',') : ''
  return topLevelKeys === 'encrypted,encryption,responseId,revision,schemaVersion,submittedAt,surveyId'
    && encryptionKeys === 'algorithm,ciphertext,encryptedKey,iv'
    && item.schemaVersion === 1
    && typeof item.surveyId === 'string' && /^[a-z0-9][a-z0-9-]{2,63}$/.test(item.surveyId)
    && typeof item.revision === 'number' && Number.isInteger(item.revision) && item.revision > 0
    && typeof item.responseId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.responseId)
    && typeof item.submittedAt === 'string' && !Number.isNaN(Date.parse(item.submittedAt))
    && item.encrypted === true && encryption?.algorithm === 'RSA-OAEP-256+A256GCM'
    && typeof encryption.encryptedKey === 'string' && encryption.encryptedKey.length > 100
    && typeof encryption.iv === 'string' && encryption.iv.length >= 16
    && typeof encryption.ciphertext === 'string' && encryption.ciphertext.length > 20
}

async function verifyTurnstile(token: string, env: Env): Promise<boolean> {
  const body = new FormData()
  body.set('secret', env.TURNSTILE_SECRET_KEY)
  body.set('response', token)
  body.set('idempotency_key', crypto.randomUUID())
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  if (!response.ok) return false
  const result = await response.json() as { success?: boolean }
  return result.success === true
}

async function validatePublishedSurvey(response: EncryptedResponse, env: Env): Promise<void> {
  const file = await readGitHubJson(env, `surveys/${response.surveyId}/survey.json`)
  if (!file || !file.value || typeof file.value !== 'object') throw new Error('게시 설문을 찾을 수 없습니다.')
  const survey = file.value as Record<string, unknown>
  if (survey.surveyId !== response.surveyId || survey.status !== 'published') throw new Error('현재 응답을 받는 설문이 아닙니다.')
  if (survey.revision !== response.revision) throw new Error('설문이 수정되었습니다. 페이지를 새로고침한 뒤 다시 제출하세요.')
}

async function saveResponse(envelope: EncryptedResponse, env: Env): Promise<{ path: string; sha: string }> {
  const path = `surveys/${envelope.surveyId}/responses/${envelope.responseId}.json`
  const serialized = `${JSON.stringify(envelope, null, 2)}\n`
  const existing = await readGitHubJson(env, path)
  if (existing) {
    if (JSON.stringify(existing.value) === JSON.stringify(envelope)) return { path, sha: existing.sha }
    throw new Error('같은 응답 ID로 다른 내용이 이미 저장되어 있습니다.')
  }

  let writeStatus = 500
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const write = await github(env, `/contents/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `response: ${envelope.surveyId}/${envelope.responseId}`,
        content: utf8Base64(serialized),
        branch: env.DATA_BRANCH,
        committer: { name: 'smart-survey-worker[bot]', email: 'smart-survey-worker@users.noreply.github.com' },
      }),
    })
    writeStatus = write.status
    if (write.ok) break
    if (write.status === 409 || write.status === 422) {
      const afterConflict = await readGitHubJson(env, path)
      if (afterConflict && JSON.stringify(afterConflict.value) === JSON.stringify(envelope)) return { path, sha: afterConflict.sha }
      if (write.status === 409 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.floor(Math.random() * 200)))
        continue
      }
    }
    throw new Error(`GitHub 응답 저장 실패 (${write.status})`)
  }
  if (writeStatus < 200 || writeStatus >= 300) throw new Error(`GitHub 응답 저장 실패 (${writeStatus})`)

  const stored = await readGitHubJson(env, path)
  if (!stored || JSON.stringify(stored.value) !== JSON.stringify(envelope)) throw new Error('GitHub 저장 후 내용 확인에 실패했습니다.')
  return { path, sha: stored.sha }
}

async function listResponseFiles(surveyId: string, env: Env): Promise<Array<{ name: string; url: string }>> {
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(surveyId)) throw new Error('설문 ID 형식이 올바르지 않습니다.')
  const response = await github(env, `/contents/surveys/${surveyId}/responses?ref=${encodeURIComponent(env.DATA_BRANCH)}`)
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`GitHub 응답 목록 조회 실패 (${response.status})`)
  const files = await response.json() as GitHubContent[]
  if (!Array.isArray(files)) throw new Error('GitHub 응답 목록 형식이 올바르지 않습니다.')
  if (files.length >= 1000) throw new Error('응답이 1,000개 이상입니다. GitHub API 페이지 분할 수집이 필요합니다.')
  return files
    .filter((file) => file.type === 'file' && file.name.endsWith('.json') && typeof file.download_url === 'string')
    .map((file) => ({ name: file.name, url: file.download_url as string }))
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true, configured: isConfigured(env) })

  const origin = allowedOrigin(request, env)
  if (!origin) return json({ error: '허용되지 않은 요청 출처입니다.' }, 403)
  const cors = corsHeaders(origin)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  if (url.pathname === '/v1/config' && request.method === 'GET') {
    return json({ enabled: isConfigured(env), turnstileSiteKey: env.TURNSTILE_SITE_KEY || '', encryptionPublicKey: env.RESPONSE_PUBLIC_KEY_PEM?.replaceAll('\\n', '\n') || '' }, 200, { ...cors, 'Cache-Control': 'public, max-age=300' })
  }

  if (url.pathname === '/v1/responses' && request.method === 'POST') {
    if (!isConfigured(env)) return json({ error: '자동 제출 서비스 설정이 아직 완료되지 않았습니다.' }, 503, cors)
    const declaredLength = Number(request.headers.get('Content-Length') || 0)
    if (declaredLength > MAX_BODY_BYTES) return json({ error: '응답 데이터가 너무 큽니다.' }, 413, cors)
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: '응답 데이터가 너무 큽니다.' }, 413, cors)
    let body: { turnstileToken?: unknown; response?: unknown }
    try { body = JSON.parse(raw) as typeof body } catch { return json({ error: 'JSON 형식이 올바르지 않습니다.' }, 400, cors) }
    if (typeof body.turnstileToken !== 'string' || !body.turnstileToken) return json({ error: '보안 확인이 필요합니다.' }, 400, cors)
    if (!isEncryptedResponse(body.response)) return json({ error: '암호화 응답 형식이 올바르지 않습니다.' }, 400, cors)
    if (!await verifyTurnstile(body.turnstileToken, env)) return json({ error: '보안 확인이 만료되었거나 실패했습니다. 다시 확인해 주세요.' }, 403, cors)
    await validatePublishedSurvey(body.response, env)
    const stored = await saveResponse(body.response, env)
    return json({ ok: true, verified: true, responseId: body.response.responseId, ...stored }, 201, cors)
  }

  if (url.pathname === '/v1/responses' && request.method === 'GET') {
    const surveyId = url.searchParams.get('surveyId') || ''
    return json({ files: await listResponseFiles(surveyId, env) }, 200, cors)
  }

  return json({ error: '요청한 API 경로를 찾을 수 없습니다.' }, 404, cors)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env)
    } catch (error) {
      const message = error instanceof Error ? error.message : '응답 처리 중 오류가 발생했습니다.'
      const origin = allowedOrigin(request, env)
      return json({ error: message }, 500, origin ? corsHeaders(origin) : {})
    }
  },
}
