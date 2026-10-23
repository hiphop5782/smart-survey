import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QuestionRenderer } from '../components/QuestionRenderer'
import { Loading } from '../components/Loading'
import { StatusBanner } from '../components/StatusBanner'
import { isQuestionVisible, validateQuestionAnswer } from '../domain/visibility'
import type { AnswerValue, Survey } from '../domain/types'
import { fetchSurvey } from '../lib/github/dataSource'
import { downloadJson, safeFilenameSegment } from '../lib/files'

export function SurveyPage() {
  const { surveyId = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    setError(null)
    void fetchSurvey(surveyId)
      .then(({ survey: loaded, demo }) => {
        if (loaded.status !== 'published') throw new Error(loaded.status === 'closed' ? '종료된 설문입니다.' : '아직 게시되지 않은 설문입니다.')
        setSurvey(loaded)
        setIsDemo(demo)
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '설문을 불러오지 못했습니다.'))
  }, [surveyId])

  const visibleQuestions = useMemo(() => survey?.questions.filter((question) => isQuestionVisible(question, answers)) ?? [], [survey, answers])
  const current = visibleQuestions[Math.min(step, Math.max(visibleQuestions.length - 1, 0))]
  const currentError = current ? validateQuestionAnswer(current, answers[current.id]) : null
  const progress = visibleQuestions.length ? Math.round(((step + 1) / visibleQuestions.length) * 100) : 0

  function next() {
    if (currentError) return
    if (step < visibleQuestions.length - 1) setStep((value) => value + 1)
    else setCompleted(true)
  }

  function downloadResponse() {
    if (!survey) return
    const invalid = visibleQuestions.find((question) => validateQuestionAnswer(question, answers[question.id]))
    if (invalid) {
      setCompleted(false)
      setStep(visibleQuestions.indexOf(invalid))
      return
    }
    const visibleAnswers = Object.fromEntries(visibleQuestions.map((question) => [question.id, answers[question.id]]).filter((entry) => entry[1] !== undefined))
    const payload = {
      schemaVersion: 1 as const,
      surveyId: survey.surveyId,
      revision: survey.revision,
      responseId: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      answers: visibleAnswers,
    }
    downloadJson(`${safeFilenameSegment(survey.surveyId)}-response-${payload.responseId.slice(0, 8)}.json`, payload)
  }

  if (error) return <section className="page-section narrow"><StatusBanner tone="danger" title="설문을 열 수 없습니다.">{error}</StatusBanner><Link className="button secondary" to="/">홈으로 돌아가기</Link></section>
  if (!survey || !current) return <section className="page-section"><Loading label="설문을 준비하고 있습니다." /></section>

  if (completed) return (
    <section className="page-section completion-page narrow">
      <div className="completion-mark">✓</div>
      {isDemo && <span className="demo-badge">DEMO</span>}
      <h1>응답 파일을 준비했습니다.</h1>
      <p>아래 버튼을 누르면 이 기기에 JSON 파일이 저장됩니다. <strong>파일 다운로드는 GitHub 제출이나 강사에게 자동 전송된 것이 아닙니다.</strong></p>
      <StatusBanner tone="warning" title="마지막 단계가 남았습니다.">내려받은 파일을 강사가 안내한 안전한 제출 경로로 직접 전달하세요. 파일에 주관식 답변이 포함되어 있을 수 있습니다.</StatusBanner>
      <div className="button-row"><button className="button primary" onClick={downloadResponse}>응답 JSON 내려받기</button><button className="button secondary" onClick={() => setCompleted(false)}>답변 다시 확인</button></div>
    </section>
  )

  return (
    <section className="runner-shell">
      <header className="runner-header">
        <div><span className="eyebrow">{survey.course.name} · {survey.course.cohort}</span><h1>{survey.title}</h1>{isDemo && <span className="demo-badge">DEMO 설문</span>}</div>
        <div className="runner-progress"><div><span>{step + 1} / {visibleQuestions.length}</span><strong>{progress}%</strong></div><progress max="100" value={progress}>{progress}%</progress></div>
      </header>
      <div className="runner-body">
        <QuestionRenderer question={current} value={answers[current.id]} onChange={(value) => setAnswers((currentAnswers) => ({ ...currentAnswers, [current.id]: value }))} error={currentError} />
        <div className="runner-actions">
          <button className="button secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>이전</button>
          <button className="button primary" onClick={next}>{step === visibleQuestions.length - 1 ? '답변 확인' : '다음'}</button>
        </div>
      </div>
      <p className="runner-footnote">답변은 현재 브라우저 메모리에만 있으며 새로고침하면 사라집니다.</p>
    </section>
  )
}
