import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSurveyIndex } from '../lib/github/dataSource'
import type { SurveyIndexItem } from '../domain/types'
import { Loading } from '../components/Loading'
import { StatusBanner } from '../components/StatusBanner'

export function HomePage() {
  const [surveys, setSurveys] = useState<SurveyIndexItem[]>([])
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchSurveyIndex().then((result) => {
      setSurveys(result.surveys)
      setDemo(result.demo)
      setLoading(false)
    })
  }, [])

  return (
    <>
      <section className="hero page-section">
        <div className="hero-copy">
          <div className="hero-kicker"><span />CURRICULUM READINESS</div>
          <h1>수업의 시작을,<br /><em>더 정확하게.</em></h1>
          <p>학습자의 경험과 준비도를 미리 이해하고, 첫 수업부터 모두에게 맞는 속도로 시작하세요.</p>
          <div className="hero-actions"><a href="#available-surveys" className="button primary">설문 참여하기</a><Link to="/admin" className="button secondary">관리자 콘솔</Link></div>
          <div className="hero-note"><span aria-hidden="true">✓</span> 이름과 연락처를 기본 수집하지 않으며, 답변은 제출 전에 암호화됩니다.</div>
        </div>
        <div className="product-preview" aria-label="설문 분석 화면 예시">
          <div className="preview-toolbar"><span /><span /><span /><small>제품 미리보기 · 예시 데이터</small></div>
          <div className="preview-content">
            <div className="preview-title"><div><span>Python · AI 과정</span><strong>학습 준비도</strong></div><b>응답 24</b></div>
            <div className="preview-metrics"><div><small>코드 이해도</small><strong>72%</strong><i style={{ width: '72%' }} /></div><div><small>AI 활용 경험</small><strong>58%</strong><i style={{ width: '58%' }} /></div></div>
            <div className="preview-chart"><div><span style={{ height: '42%' }} /><small>입문</small></div><div><span style={{ height: '78%' }} /><small>기초</small></div><div><span style={{ height: '56%' }} /><small>활용</small></div><div><span style={{ height: '30%' }} /><small>심화</small></div></div>
            <div className="preview-insight"><span>✦</span><p><strong>수업 제안</strong>첫 실습 전 변수와 반복문을 짧게 복습하세요.</p></div>
          </div>
        </div>
      </section>

      <section className="process-band" aria-label="이용 과정">
        <div><strong>1</strong><span>과정 선택</span><small>공유받은 과정과 기수를 확인합니다.</small></div>
        <div><strong>2</strong><span>사전 진단</span><small>경험과 준비도를 편하게 답합니다.</small></div>
        <div><strong>3</strong><span>안전한 제출</span><small>브라우저에서 암호화해 자동 저장합니다.</small></div>
      </section>

      <section className="page-section survey-list-section" id="available-surveys">
        <div className="section-heading"><div><span className="eyebrow">OPEN SURVEYS</span><h2>참여 가능한 설문</h2></div><p>과정명과 기수를 확인한 뒤 시작하세요.</p></div>
        {demo && <StatusBanner tone="warning" title="데모 목록을 표시하고 있습니다.">data 브랜치에 게시된 설문 목록이 아직 없어 예시 설문만 제공합니다. 데모 응답은 실제로 수집되지 않습니다.</StatusBanner>}
        {loading ? <Loading /> : (
          <div className="survey-card-grid">
            {surveys.map((survey) => (
              <article className="survey-card" key={survey.surveyId}>
                <div className="card-topline"><span>{survey.courseName}</span>{demo && <b className="demo-badge">DEMO</b>}</div>
                <h3>{survey.title}</h3>
                <p>{survey.cohort} · 리비전 {survey.revision}</p>
                <Link className="button primary full" to={`/s/${survey.surveyId}`}>설문 시작하기 <span aria-hidden="true">→</span></Link>
              </article>
            ))}
            {!surveys.length && <div className="empty-state"><h3>게시된 설문이 없습니다.</h3><p>관리자가 설문을 게시하면 이곳에 표시됩니다.</p></div>}
          </div>
        )}
      </section>

      <section className="privacy-section page-section">
        <div className="privacy-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3" /><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M12 14v3" /></svg></div>
        <div><span className="eyebrow">PRIVACY BY DESIGN</span><h2>응답은 읽을 수 없게 만든 뒤 저장합니다.</h2><p>평문 답변은 학생의 브라우저를 벗어나지 않습니다. 공개 저장소에는 암호문만 남고, 관리자가 보관한 개인키가 있어야 결과를 열 수 있습니다.</p></div>
      </section>
    </>
  )
}
