import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuestionRenderer } from '../src/components/QuestionRenderer'

describe('QuestionRenderer', () => {
  it('renders a single-choice question and returns the stored value', () => {
    const onChange = vi.fn()
    render(<QuestionRenderer question={{ id: 'major', type: 'single', title: '전공인가요?', options: [{ value: 'yes', label: '예' }, { value: 'no', label: '아니오' }] }} value={undefined} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('예'))
    expect(onChange).toHaveBeenCalledWith('yes')
  })

  it('renders code without interpreting it as HTML', () => {
    render(<QuestionRenderer question={{ id: 'code', type: 'codeQuiz', title: '코드', language: 'html', code: '<img src=x onerror=alert(1)>', options: [{ value: 'safe', label: '안전' }, { value: 'other', label: '기타' }] }} value={undefined} onChange={() => undefined} />)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })
})
