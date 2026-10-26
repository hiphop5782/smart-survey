import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAdminSession } from '../app/AdminSession'
import { validateGitHubToken } from '../lib/github/client'

interface AdminAccessButtonProps {
  children: ReactNode
  className?: string
  destination?: string
  forcePrompt?: boolean
}

export function AdminAccessButton({
  children,
  className,
  destination = '/admin',
  forcePrompt = false,
}: AdminAccessButtonProps) {
  const navigate = useNavigate()
  const { token, connect } = useAdminSession()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !checking) setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [checking, open])

  const beginAccess = () => {
    if (token && !forcePrompt) {
      navigate(destination)
      return
    }
    setDraft('')
    setShowKey(false)
    setError('')
    setOpen(true)
  }

  const close = () => {
    if (!checking) setOpen(false)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextToken = draft.trim()
    if (!nextToken) {
      setError('GitHub 키를 입력하세요.')
      inputRef.current?.focus()
      return
    }

    setChecking(true)
    setError('')
    try {
      const account = await validateGitHubToken(nextToken)
      connect(nextToken, account.login)
      setOpen(false)
      setDraft('')
      navigate(destination)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'GitHub 키를 확인하지 못했습니다.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={beginAccess}>{children}</button>
      {open && createPortal(
        <div className="admin-access-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close()
        }}>
          <section className="admin-access-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-access-title">
            <button type="button" className="dialog-close" onClick={close} aria-label="닫기" disabled={checking}>×</button>
            <div className="dialog-github-mark" aria-hidden="true">GH</div>
            <span className="eyebrow">ADMIN ACCESS</span>
            <h2 id="admin-access-title">GitHub 키로 계속하기</h2>
            <p className="dialog-intro">설문을 만들고 수정하려면 이 저장소에 접근할 수 있는 관리자 키가 필요합니다.</p>
            <form onSubmit={(event) => void submit(event)}>
              <label htmlFor="github-admin-token">Fine-grained personal access token</label>
              <div className="dialog-token-field">
                <input
                  ref={inputRef}
                  id="github-admin-token"
                  type={showKey ? 'text' : 'password'}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="github_pat_…"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'admin-access-error' : 'admin-access-note'}
                />
                <button type="button" onClick={() => setShowKey((value) => !value)}>{showKey ? '숨기기' : '보기'}</button>
              </div>
              {error && <p className="dialog-error" id="admin-access-error" role="alert">{error}</p>}
              <p className="dialog-security-note" id="admin-access-note"><span aria-hidden="true">✓</span> 키는 서버나 브라우저 저장소에 보관하지 않으며, 새로고침하면 자동으로 지워집니다.</p>
              <button type="submit" className="button primary full" disabled={checking}>
                {checking ? <><span className="button-spinner" aria-hidden="true" />GitHub 확인 중…</> : '확인하고 관리자 화면 열기'}
              </button>
            </form>
            <a className="dialog-help-link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">키가 없나요? GitHub에서 만들기 ↗</a>
            <p className="dialog-permission-note">저장소를 <strong>hiphop5782/smart-survey</strong>로 제한하고 <strong>Contents: Read and write</strong> 권한을 선택하세요.</p>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
