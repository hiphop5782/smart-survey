import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QuestionRenderer } from '../components/QuestionRenderer'
import { Loading } from '../components/Loading'
import { StatusBanner } from '../components/StatusBanner'
import { TurnstileWidget } from '../components/TurnstileWidget'
import { isQuestionVisible, validateQuestionAnswer } from '../domain/visibility'
import type { AnswerValue, Survey, SurveyResponse } from '../domain/types'
import { fetchSurvey } from '../lib/github/dataSource'
import { downloadJson, safeFilenameSegment } from '../lib/files'
import { encryptSurveyResponse } from '../lib/submission/crypto'
import { fetchSubmissionConfig, submitEncryptedResponse, type SubmissionConfig, type SubmissionReceipt } from '../lib/submission/client'

export function SurveyPage() {
  const { surveyId = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [preparedResponse, setPreparedResponse] = useState<SurveyResponse | null>(null)
  const [submissionConfig, setSubmissionConfig] = useState<SubmissionConfig | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)
  const [configAttempt, setConfigAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null)

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

  useEffect(() => {
    if (!completed || isDemo || submissionConfig || receipt) return
    setSubmissionError(null)
    void fetchSubmissionConfig()
      .then((config) => {
        if (!config.enabled || !config.turnstileSiteKey || !config.encryptionPublicKey) throw new Error('자동 제출 서비스가 아직 설정되지 않았습니다.')
        setSubmissionConfig(config)
      })
      .catch((reason: unknown) => setSubmissionError(reason instanceof Error ? reason.message : '자동 제출 서비스를 불러오지 못했습니다.'))
  }, [completed, configAttempt, isDemo, receipt, submissionConfig])

  const visibleQuestions = useMemo(() => survey?.questions.filter((question) => isQuestionVisible(question, answers)) ?? [], [survey, answers])
  const current = visibleQuestions[Math.min(step, Math.max(visibleQuestions.length - 1, 0))]
  const currentError = current ? validateQuestionAnswer(current, answers[current.id]) : null
  const progress = visibleQuestions.length ? Math.round(((step + 1) / visibleQuestions.length) * 100) : 0

  function next() {
    if (currentError) return
    if (step < visibleQuestions.length - 1) setStep((value) => value + 1)
    else prepareCompletion()
  }

  function prepareCompletion() {
    if (!survey) return
    const invalid = visibleQuestions.find((question) => validateQuestionAnswer(question, answers[question.id]))
    if (invalid) {
      setStep(visibleQuestions.indexOf(invalid))
      return
    }
    const visibleAnswers = Object.fromEntries(visibleQuestions.map((question) => [question.id, answers[question.id]]).filter((entry) => entry[1] !== undefined))
    setPreparedResponse((currentResponse) => currentResponse ?? {
      schemaVersion: 1,
      surveyId: survey.surveyId,
      revision: survey.revision,
      responseId: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      answers: visibleAnswers,
    })
    setCompleted(true)
  }

  function downloadResponse() {
    if (!survey) return
    if (!preparedResponse) return
    downloadJson(`${safeFilenameSegment(survey.surveyId)}-response-${preparedResponse.responseId.slice(0, 8)}.json`, preparedResponse)
  }

  async function submitResponse() {
    if (!preparedResponse || !submissionConfig || !turnstileToken) return
    setSubmitting(true)
    setSubmissionError(null)
    try {
      const envelope = await encryptSurveyResponse(preparedResponse, submissionConfig.encryptionPublicKey)
      const saved = await submitEncryptedResponse(envelope, turnstileToken)
      if (!saved.ok || !saved.verified || saved.responseId !== preparedResponse.responseId) throw new Error('저장 확인 정보가 응답과 일치하지 않습니다.')
      setReceipt(saved)
    } catch (reason) {
      setSubmissionError(reason instanceof Error ? reason.message : '응답 자동 제출에 실패했습니다.')
      setTurnstileToken('')
      setChallengeKey((value) => value + 1)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <section className="page-section narrow"><StatusBanner tone="danger" title="설문을 열 수 없습니다.">{error}</StatusBanner><Link className="button secondary" to="/">홈으로 돌아가기</Link></section>
  if (!survey || !current) return <section className="page-section"><Loading label="설문을 준비하고 있습니다." /></section>

  if (completed) return (
    <section className="page-section completion-page narrow">
      <div className="completion-mark">{receipt ? '✓' : '↑'}</div>
      {isDemo && <span className="demo-badge">DEMO</span>}
      {receipt ? (
        <>
          <h1>제출이 완료되었습니다.</h1>
          <p>암호화된 응답이 저장되었고 저장된 내용을 다시 확인했습니다. 이 창을 닫아도 됩니다.</p>
          <StatusBanner tone="success" title="제출 확인 번호">{receipt.responseId}<br /><small>{receipt.path}</small></StatusBanner>
        </>
      ) : (
        <>
          <h1>응답을 제출해 주세요.</h1>
          <p>보안 확인 후 제출 버튼을 누르면 답변이 이 기기에서 암호화되어 자동 저장됩니다. 공개 저장소에는 평문 답변이 올라가지 않습니다.</p>
          {isDemo ? (
            <StatusBanner tone="warning" title="데모 설문은 자동 제출하지 않습니다.">아래 JSON 다운로드로 흐름을 시험할 수 있으며 실제 응답으로 집계되지 않습니다.</StatusBanner>
          ) : submissionConfig ? (
            <div className="submission-panel">
              <TurnstileWidget key={challengeKey} siteKey={submissionConfig.turnstileSiteKey} onToken={setTurnstileToken} />
              <button className="button primary full" disabled={!turnstileToken || submitting} onClick={() => void submitResponse()}>{submitting ? '암호화하여 저장하는 중…' : '응답 제출하기'}</button>
            </div>
          ) : !submissionError ? <Loading label="안전한 제출 환경을 준비하고 있습니다." /> : null}
          {submissionError && <StatusBanner tone="danger" title="자동 제출을 완료하지 못했습니다.">{submissionError}<br /><button className="button ghost" onClick={() => { setSubmissionError(null); setConfigAttempt((value) => value + 1) }}>자동 제출 다시 연결</button></StatusBanner>}
        </>
      )}
      <div className="button-row">{receipt ? <Link className="button secondary" to="/">홈으로 돌아가기</Link> : <button className="button secondary" onClick={() => { setCompleted(false); setPreparedResponse(null); setSubmissionError(null); setTurnstileToken('') }}>답변 다시 확인</button>}</div>
      {!receipt && <details className="manual-fallback"><summary>자동 제출이 안 될 때 수동 백업</summary><p>응답 JSON을 이 기기에 저장한 뒤 강사가 안내한 안전한 경로로 전달하세요. 다운로드만으로는 제출되지 않습니다.</p><button className="button ghost" onClick={downloadResponse}>응답 JSON 내려받기</button></details>}
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
