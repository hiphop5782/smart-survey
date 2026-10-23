export function downloadTextFile(filename: string, contents: string, mimeType = 'application/json'): void {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(filename: string, value: unknown): void {
  downloadTextFile(filename, `${JSON.stringify(value, null, 2)}\n`)
}

export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text()
  return JSON.parse(text) as unknown
}

export function safeFilenameSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9가-힣_-]/g, '-').replace(/-+/g, '-').slice(0, 80)
}
