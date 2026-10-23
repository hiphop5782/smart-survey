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
        <div className="eyebrow">BEFORE THE FIRST CLASS</div>
        <h1>수업의 시작점을<br /><em>함께</em> 찾습니다.</h1>
        <p>평가를 위한 시험이 아닙니다. 지금의 경험과 궁금한 점을 알려주시면 강사가 첫날의 설명과 실습 속도를 더 알맞게 준비할 수 있습니다.</p>
        <div className="hero-actions"><a href="#available-surveys" className="button primary">참여 가능한 설문 보기</a><Link to="/admin" className="button secondary">강사·관리자 화면</Link></div>
        <div className="hero-note"><span>✓</span> 이름·이메일·정확한 생년월일은 기본 문항에서 묻지 않습니다.</div>
      </section>

      <section className="process-band" aria-label="이용 과정">
        <div><strong>01</strong><span>과정 선택</span><small>공유받은 설문을 확인합니다.</small></div>
        <div><strong>02</strong><span>사전 진단</span><small>경험과 준비도를 솔직하게 답합니다.</small></div>
        <div><strong>03</strong><span>파일 전달</span><small>응답 JSON을 내려받아 강사에게 전달합니다.</small></div>
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
        <div className="privacy-icon" aria-hidden="true">◇</div>
        <div><span className="eyebrow">YOUR DATA, YOUR FILE</span><h2>응답은 자동 전송되지 않습니다.</h2><p>이 버전은 별도 서버 없이 GitHub Pages에서 동작합니다. 답변 완료 후 JSON 파일을 내려받고 강사가 안내한 안전한 방법으로 전달하세요.</p></div>
      </section>
    </>
  )
}
