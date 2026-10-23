import type { AnswerValue, Question } from '../domain/types'

interface Props {
  question: Question
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
  error?: string | null
  disabled?: boolean
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return <div className="code-panel"><span>{language}</span><pre><code>{code}</code></pre></div>
}

export function QuestionRenderer({ question, value, onChange, error, disabled }: Props) {
  const inputName = `question-${question.id}`
  const describedBy = error ? `${question.id}-error` : question.description ? `${question.id}-description` : undefined
  const renderOptions = (type: 'radio' | 'checkbox') => (
    <div className="option-grid">
      {question.options?.map((option) => {
        const checked = type === 'checkbox' ? Array.isArray(value) && value.includes(option.value) : value === option.value
        return (
          <label className={`choice ${checked ? 'selected' : ''}`} key={option.value}>
            <input
              type={type}
              name={inputName}
              value={option.value}
              checked={checked}
              disabled={disabled}
              onChange={(event) => {
                if (type === 'radio') return onChange(option.value)
                const current = Array.isArray(value) ? value : []
                onChange(event.target.checked ? [...current, option.value] : current.filter((item) => item !== option.value))
              }}
            />
            <span>{option.label}</span>
          </label>
        )
      })}
    </div>
  )

  return (
    <fieldset className="question-fieldset" aria-describedby={describedBy}>
      <legend>{question.title}{question.required && <span className="required">필수</span>}</legend>
      {question.description && <p id={`${question.id}-description`} className="question-description">{question.description}</p>}
      {'code' in question && question.code && <CodeBlock language={question.language} code={question.code} />}

      {(question.type === 'single' || question.type === 'codeFamiliarity' || question.type === 'codeQuiz') && renderOptions('radio')}
      {question.type === 'multiple' && renderOptions('checkbox')}
      {question.type === 'shortText' && (
        <input className="text-input" type="text" value={typeof value === 'string' ? value : ''} disabled={disabled} maxLength={question.validation?.maxLength} onChange={(event) => onChange(event.target.value)} />
      )}
      {question.type === 'longText' && (
        <textarea className="text-input" rows={7} value={typeof value === 'string' ? value : ''} disabled={disabled} maxLength={question.validation?.maxLength} onChange={(event) => onChange(event.target.value)} />
      )}
      {question.type === 'scale' && 'min' in question && (
        <div className="scale-wrap">
          <span>{question.minLabel}</span>
          <div className="scale-options">
            {Array.from({ length: question.max - question.min + 1 }, (_, index) => question.min + index).map((number) => (
              <label className={value === number ? 'selected' : ''} key={number}>
                <input type="radio" name={inputName} value={number} checked={value === number} disabled={disabled} onChange={() => onChange(number)} />
                <span>{number}</span>
              </label>
            ))}
          </div>
          <span>{question.maxLabel}</span>
        </div>
      )}
      {question.type === 'termMatrix' && 'terms' in question && (
        <div className="matrix-scroll">
          <table className="term-matrix">
            <thead><tr><th>용어</th>{question.levels.map((level) => <th key={level.value}>{level.label}</th>)}</tr></thead>
            <tbody>
              {question.terms.map((term) => (
                <tr key={term.value}>
                  <th>{term.label}</th>
                  {question.levels.map((level) => (
                    <td key={level.value}><label><input type="radio" name={`${inputName}-${term.value}`} value={level.value} disabled={disabled} checked={typeof value === 'object' && !Array.isArray(value) && value?.[term.value] === level.value} onChange={() => onChange({ ...(typeof value === 'object' && !Array.isArray(value) && value ? value : {}), [term.value]: level.value })} /><span className="sr-only">{term.label}: {level.label}</span></label></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <p className="field-error" id={`${question.id}-error`}>{error}</p>}
    </fieldset>
  )
}
