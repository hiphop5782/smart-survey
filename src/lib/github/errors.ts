export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(message)
    this.name = 'GitHubApiError'
  }
}

const statusMessages: Record<number, string> = {
  401: '인증정보가 올바르지 않거나 만료되었습니다.',
  403: '저장소 쓰기 권한이 없거나 API 사용 한도를 초과했습니다.',
  404: '저장소, 브랜치 또는 파일을 찾지 못했습니다. data 브랜치를 먼저 준비하세요.',
  409: '다른 변경과 충돌했습니다. 최신 파일을 다시 불러온 뒤 시도하세요.',
  422: 'GitHub가 요청 내용을 처리할 수 없습니다. 파일 경로와 브랜치 상태를 확인하세요.',
}

export function githubErrorMessage(status: number, detail?: string): string {
  return statusMessages[status] ?? `GitHub 요청에 실패했습니다. (HTTP ${status})${detail ? ` ${detail}` : ''}`
}
