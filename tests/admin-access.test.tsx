import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSessionProvider } from '../src/app/AdminSession'
import { AdminAccessButton } from '../src/components/AdminAccessButton'
import { validateGitHubToken } from '../src/lib/github/client'

vi.mock('../src/lib/github/client', () => ({
  validateGitHubToken: vi.fn(),
}))

describe('AdminAccessButton', () => {
  beforeEach(() => {
    vi.mocked(validateGitHubToken).mockReset()
  })

  it('verifies the entered key before opening the admin page', async () => {
    vi.mocked(validateGitHubToken).mockResolvedValue({ login: 'survey-admin' })

    render(
      <AdminSessionProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<AdminAccessButton>관리자</AdminAccessButton>} />
            <Route path="/admin" element={<h1>설문 관리</h1>} />
          </Routes>
        </MemoryRouter>
      </AdminSessionProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '관리자' }))
    expect(screen.getByRole('dialog', { name: 'GitHub 키로 계속하기' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Fine-grained personal access token'), {
      target: { value: '  github_pat_example  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '확인하고 관리자 화면 열기' }))

    expect(await screen.findByRole('heading', { name: '설문 관리' })).toBeInTheDocument()
    expect(validateGitHubToken).toHaveBeenCalledWith('github_pat_example')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the dialog open and shows a verification error', async () => {
    vi.mocked(validateGitHubToken).mockRejectedValue(new Error('키가 유효하지 않습니다.'))

    render(
      <AdminSessionProvider>
        <MemoryRouter>
          <AdminAccessButton>관리자</AdminAccessButton>
        </MemoryRouter>
      </AdminSessionProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '관리자' }))
    fireEvent.change(screen.getByLabelText('Fine-grained personal access token'), {
      target: { value: 'bad-token' },
    })
    fireEvent.submit(screen.getByRole('button', { name: '확인하고 관리자 화면 열기' }).closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('키가 유효하지 않습니다.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
