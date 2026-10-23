import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { calculateAnalytics, responsesToCsv } from '../domain/analytics'
import { formatSchemaError, parseSurvey, parseSurveyResponse } from '../domain/schema'
import type { Survey, SurveyResponse } from '../domain/types'
import { demoResponses } from '../data/demo'
import { fetchSurvey } from '../lib/github/dataSource'
import { downloadJson, downloadTextFile, readJsonFile, safeFilenameSegment } from '../lib/files'
import { decryptSurveyResponse } from '../lib/submission/crypto'
import { fetchEncryptedResponses } from '../lib/submission/client'
import { Loading } from '../components/Loading'
import { StatusBanner } from '../components/StatusBanner'

export function ResultsPage() {
  const { surveyId = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [importMessages, setImportMessages] = useState<string[]>([])
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
  const [privateKeyPem, setPrivateKeyPem] = useState('')
  const [privateKeyName, setPrivateKeyName] = useState('')
  const [syncing, setSyncing] = useState(false)
  const responseInput = useRef<HTMLInputElement>(null)
  const surveyInput = useRef<HTMLInputElement>(null)
  const privateKeyInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void fetchSurvey(surveyId).then(({ survey: loaded, demo }) => {
      setSurvey(loaded)
      setIsDemo(demo)
      setLoading(false)
    }).catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : '설문을 불러오지 못했습니다.')
      setLoading(false)
    })
  }, [surveyId])

  const analytics = useMemo(() => survey ? calculateAnalytics(survey, responses, answerKey) : null, [survey, responses, answerKey])

  async function importSurveyFile(file: File) {
    try {
      const value = parseSurvey(await readJsonFile(file))
      if (value.surveyId !== surveyId) throw new Error(`URL의 설문 ID(${surveyId})와 파일의 설문 ID(${value.surveyId})가 다릅니다.`)
      setSurvey(value)
      setLoadError(null)
      setIsDemo(false)
    } catch (error) {
      setLoadError(formatSchemaError(error))
    }
  }

  async function importResponseFiles(files: File[]) {
    if (!survey) return
    const accepted: SurveyResponse[] = []
    const messages: string[] = []
    for (const file of files) {
      try {
        const response = parseSurveyResponse(await readJsonFile(file))
        if (response.surveyId !== survey.surveyId) throw new Error(`설문 ID 불일치: ${response.surveyId}`)
        if (response.revision !== survey.revision) throw new Error(`리비전 불일치: 응답 ${response.revision}, 설문 ${survey.revision}`)
        accepted.push(response)
      } catch (error) {
        messages.push(`${file.name}: ${formatSchemaError(error)}`)
      }
    }
    setResponses((current) => {
      const map = new Map(current.map((response) => [response.responseId, response]))
      accepted.forEach((response) => map.set(response.responseId, response))
      return [...map.values()]
    })
    if (accepted.length) messages.unshift(`${accepted.length}개 응답 파일을 가져왔습니다.`)
    setImportMessages(messages)
    setIsDemo(false)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    void importResponseFiles([...event.dataTransfer.files])
  }

  async function selectPrivateKey(file: File) {
    const pem = await file.text()
    if (!pem.includes('-----BEGIN PRIVATE KEY-----')) {
      setPrivateKeyPem('')
      setPrivateKeyName('')
      setImportMessages(['개인키는 PKCS#8 PEM 형식이어야 합니다. BEGIN PRIVATE KEY 헤더를 확인하세요.'])
      return
    }
    setPrivateKeyPem(pem)
    setPrivateKeyName(file.name)
    setImportMessages([`${file.name}을 현재 브라우저 메모리에 불러왔습니다. 키는 서버로 전송되지 않습니다.`])
  }

  async function syncEncryptedResponses() {
    if (!survey || !privateKeyPem) return
    setSyncing(true)
    const accepted: SurveyResponse[] = []
    const messages: string[] = []
    try {
      const encrypted = await fetchEncryptedResponses(survey.surveyId)
      for (const envelope of encrypted) {
        try {
          const response = await decryptSurveyResponse(envelope, privateKeyPem)
          if (response.surveyId !== survey.surveyId) throw new Error(`설문 ID 불일치: ${response.surveyId}`)
          if (response.revision !== survey.revision) throw new Error(`리비전 불일치: 응답 ${response.revision}, 설문 ${survey.revision}`)
          accepted.push(response)
        } catch (error) {
          messages.push(`${envelope.responseId}: ${formatSchemaError(error)}`)
        }
      }
      setResponses((current) => {
        const map = new Map(current.map((response) => [response.responseId, response]))
        accepted.forEach((response) => map.set(response.responseId, response))
        return [...map.values()]
      })
      messages.unshift(encrypted.length ? `암호화 응답 ${encrypted.length}개 중 ${accepted.length}개를 복호화해 반영했습니다.` : '아직 자동 제출된 응답이 없습니다.')
      setIsDemo(false)
    } catch (error) {
      messages.push(formatSchemaError(error))
    } finally {
      setImportMessages(messages)
      setSyncing(false)
    }
  }

  if (loading) return <section className="page-section"><Loading label="분석할 설문을 불러오고 있습니다." /></section>
  if (!survey) return (
    <section className="page-section narrow">
      <Link to="/admin" className="back-link">← 설문 관리</Link>
      <h1>설문 JSON이 필요합니다.</h1>
      <StatusBanner tone="danger">{loadError}</StatusBanner>
      <p>data 브랜치에서 설문을 찾지 못했습니다. 같은 설문 ID의 JSON 파일을 직접 불러오면 로컬 분석을 계속할 수 있습니다.</p>
      <input ref={surveyInput} hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSurveyFile(file) }} />
      <button className="button primary" onClick={() => surveyInput.current?.click()}>설문 JSON 가져오기</button>
    </section>
  )

  return (
    <section className="results-page page-section wide">
      <div className="results-heading"><div><Link to="/admin" className="back-link">← 설문 관리</Link><span className="eyebrow">RESULTS DASHBOARD</span><h1>{survey.title}</h1><p>{survey.course.name} · {survey.course.cohort} · revision {survey.revision}</p></div><div className="compact-actions"><button className="button ghost" disabled={!responses.length} onClick={() => downloadJson(`${safeFilenameSegment(survey.surveyId)}-responses.json`, { schemaVersion: 1, surveyId: survey.surveyId, revision: survey.revision, responses })}>JSON 내보내기</button><button className="button secondary" disabled={!responses.length} onClick={() => downloadTextFile(`${safeFilenameSegment(survey.surveyId)}-responses.csv`, responsesToCsv(survey, responses), 'text/csv')}>CSV 내보내기</button></div></div>
      {isDemo && <StatusBanner tone="warning" title="데모 설문입니다.">아래의 데모 응답 버튼을 사용한 통계에는 DEMO 표시가 유지됩니다. 실제 응답과 혼합하지 마세요.</StatusBanner>}

      <section className="encrypted-sync-panel">
        <div><span className="eyebrow">ENCRYPTED RESPONSES</span><h2>자동 제출 응답 동기화</h2><p>관리자 개인키를 이 브라우저에서만 사용해 공개 저장소의 암호문을 복호화합니다. 키와 평문 응답은 API로 전송되지 않습니다.</p></div>
        <input ref={privateKeyInput} hidden type="file" accept=".pem,application/x-pem-file,text/plain" onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectPrivateKey(file) }} />
        <div className="compact-actions"><button className="button secondary" onClick={() => privateKeyInput.current?.click()}>{privateKeyName ? `키: ${privateKeyName}` : '개인키 선택'}</button><button className="button primary" disabled={!privateKeyPem || syncing} onClick={() => void syncEncryptedResponses()}>{syncing ? '복호화하는 중…' : 'GitHub 응답 동기화'}</button>{privateKeyPem && <button className="button ghost" onClick={() => { setPrivateKeyPem(''); setPrivateKeyName(''); if (privateKeyInput.current) privateKeyInput.current.value = '' }}>키 지우기</button>}</div>
        <StatusBanner tone="warning">개인키를 잃으면 저장된 응답을 복구할 수 없습니다. 안전한 오프라인 위치에 백업하고 공유하지 마세요.</StatusBanner>
      </section>

      <div className="import-panel" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <div className="upload-icon" aria-hidden="true">⇧</div>
        <div><h2>응답 JSON 일괄 가져오기</h2><p>파일을 이곳에 끌어놓거나 여러 파일을 한 번에 선택하세요. 브라우저 안에서만 분석하며 서버로 전송하지 않습니다.</p></div>
        <input ref={responseInput} hidden type="file" multiple accept="application/json,.json" onChange={(event) => void importResponseFiles([...event.target.files ?? []])} />
        <div className="compact-actions"><button className="button primary" onClick={() => responseInput.current?.click()}>응답 파일 선택</button>{survey.surveyId === 'demo-python-ai-2026' && <button className="button secondary" onClick={() => { setResponses(demoResponses); setIsDemo(true); setImportMessages(['DEMO 응답 3개를 불러왔습니다.']); setAnswerKey({ pythonOutputQuiz: '6' }) }}>DEMO 응답 불러오기</button>}{responses.length > 0 && <button className="button ghost" onClick={() => { setResponses([]); setImportMessages([]); setIsDemo(false) }}>모두 비우기</button>}</div>
      </div>
      {importMessages.length > 0 && <StatusBanner tone={importMessages.some((message) => message.includes(':')) ? 'warning' : 'success'}>{importMessages.map((message) => <p key={message}>{message}</p>)}</StatusBanner>}

      {responses.length === 0 ? <div className="empty-state large"><span>∿</span><h2>아직 분석할 응답이 없습니다.</h2><p>자동 제출 응답을 동기화하거나 학생에게 전달받은 JSON 파일을 가져오면 통계가 표시됩니다.</p></div> : analytics && (
        <>
          {isDemo && <div className="demo-ribbon">DEMO DATA · 실제 수강생 통계가 아닙니다</div>}
          <div className="metric-grid"><article><span>가져온 응답</span><strong>{analytics.totalResponses}</strong><small>중복 ID는 마지막 파일로 반영</small></article><article><span>전체 미응답</span><strong>{analytics.totalMissingAnswers}</strong><small>표시 대상 문항 기준</small></article><article><span>분석 문항</span><strong>{analytics.questions.length}</strong><small>자기평가와 퀴즈를 분리</small></article></div>

          {survey.questions.some((question) => question.type === 'codeQuiz') && <section className="answer-key-panel"><div><h2>강사용 코드 퀴즈 정답 키</h2><p>정답은 현재 브라우저 메모리에만 유지되며 공개 설문 JSON에 저장하지 않습니다.</p></div><div className="answer-key-grid">{survey.questions.filter((question) => question.type === 'codeQuiz').map((question) => <label key={question.id}><span>{question.title}</span><select value={answerKey[question.id] ?? ''} onChange={(event) => setAnswerKey((current) => ({ ...current, [question.id]: event.target.value }))}><option value="">정답 선택 안 함</option>{question.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}</div></section>}

          <div className="analysis-grid">
            {analytics.questions.map((summary) => (
              <article className="analysis-card" key={summary.questionId}>
                <header><span>{summary.type}</span><h3>{summary.title}</h3><small>응답 {summary.answered} · 미응답 {summary.missing}</small></header>
                {summary.correctRate !== undefined && <div className="correct-rate"><strong>{summary.correctRate}%</strong><span>코드 해석 정답률 · {summary.correctCount}/{summary.answered}</span></div>}
                {summary.distribution && <div className="bar-list">{summary.distribution.map((item) => <div key={item.value}><div><span>{item.label}</span><b>{item.count}명 · {item.percentage}%</b></div><div className="bar-track"><span style={{ width: `${item.percentage}%` }} /></div></div>)}</div>}
                {summary.matrix && <div className="matrix-summary">{Object.entries(summary.matrix).map(([term, values]) => <div key={term}><strong>{term}</strong><div>{values.map((item) => <span key={item.value}>{item.label} {item.count}</span>)}</div></div>)}</div>}
                {summary.textValues && <details className="text-responses"><summary>원문 응답 {summary.textValues.length}개 보기</summary><StatusBanner tone="warning">원문에는 개인 식별 정보가 포함될 수 있습니다. 화면 공유와 내보내기에 주의하세요.</StatusBanner>{summary.textValues.map((value, index) => <blockquote key={`${value}-${index}`}>{value}</blockquote>)}</details>}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
