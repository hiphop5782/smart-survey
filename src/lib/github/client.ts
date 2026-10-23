import { GitHubApiError, githubErrorMessage } from './errors'

const OWNER = 'hiphop5782'
const REPOSITORY = 'smart-survey'
const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPOSITORY}`

interface GitHubContentResponse {
  content: string
  encoding: string
  sha: string
  path: string
}

interface PutFileResponse {
  content: { sha: string; path: string } | null
  commit: { sha: string }
}

function assertSafePath(path: string): void {
  if (!/^(templates|surveys)\/[a-zA-Z0-9._/-]+\.json$/.test(path) || path.includes('..') || path.startsWith('/')) {
    throw new Error('허용되지 않는 GitHub 파일 경로입니다.')
  }
}

function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)))
  return btoa(binary)
}

function decodeUtf8Base64(value: string): string {
  const binary = atob(value.replaceAll('\n', ''))
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function parseError(response: Response): Promise<never> {
  let detail = ''
  try {
    const payload = (await response.json()) as { message?: string }
    detail = payload.message ?? ''
  } catch {
    detail = response.statusText
  }
  throw new GitHubApiError(githubErrorMessage(response.status, detail), response.status, detail)
}

export async function getGitHubFile(path: string, token?: string, branch = 'data'): Promise<{ value: unknown; sha: string }> {
  assertSafePath(path)
  const response = await fetch(`${API_ROOT}/contents/${path}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) return parseError(response)
  const payload = (await response.json()) as GitHubContentResponse
  return { value: JSON.parse(decodeUtf8Base64(payload.content)) as unknown, sha: payload.sha }
}

export async function putGitHubJson(
  path: string,
  value: unknown,
  token: string,
  options: { sha?: string; message: string; branch?: string },
): Promise<PutFileResponse> {
  assertSafePath(path)
  if (!token.trim()) throw new Error('GitHub 토큰을 입력하세요.')
  const response = await fetch(`${API_ROOT}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message: options.message,
      content: encodeUtf8Base64(`${JSON.stringify(value, null, 2)}\n`),
      branch: options.branch ?? 'data',
      ...(options.sha ? { sha: options.sha } : {}),
    }),
  })
  if (!response.ok) return parseError(response)
  return (await response.json()) as PutFileResponse
}

export async function saveAndVerifyGitHubJson(
  path: string,
  value: unknown,
  token: string,
  message: string,
): Promise<{ sha: string }> {
  let currentSha: string | undefined
  try {
    currentSha = (await getGitHubFile(path, token)).sha
  } catch (error) {
    if (!(error instanceof GitHubApiError) || error.status !== 404) throw error
  }
  await putGitHubJson(path, value, token, { sha: currentSha, message })
  const verified = await getGitHubFile(path, token)
  if (JSON.stringify(verified.value) !== JSON.stringify(value)) {
    throw new Error('GitHub 저장 후 재조회한 내용이 요청한 데이터와 일치하지 않습니다.')
  }
  return { sha: verified.sha }
}

export const githubRepository = { owner: OWNER, repository: REPOSITORY, apiRoot: API_ROOT }
