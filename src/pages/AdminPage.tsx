import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBanner } from '../components/StatusBanner'
import { Loading } from '../components/Loading'
import { AdminAccessButton } from '../components/AdminAccessButton'
import { useAdminSession } from '../app/AdminSession'
import { fetchSurveyIndex } from '../lib/github/dataSource'
import type { SurveyIndexItem } from '../domain/types'

export function AdminPage() {
  const { token, githubLogin, clearToken } = useAdminSession()
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
    <section className="page-section admin-page">
      <div className="admin-heading"><div><span className="eyebrow">INSTRUCTOR CONSOLE</span><h1>설문 관리</h1><p>과정에 맞는 문항을 구성하고 응답 파일을 분석하세요.</p></div>{token ? <Link className="button primary" to="/admin/surveys/new">새 설문 만들기</Link> : <AdminAccessButton className="button primary" destination="/admin/surveys/new">새 설문 만들기</AdminAccessButton>}</div>

      <div className="admin-token-panel">
        <div><h2>GitHub 연결</h2><p>설문을 data 브랜치에 저장할 때만 사용합니다. 키는 현재 탭의 메모리에만 있고 새로고침하면 사라집니다.</p></div>
        {token ? (
          <div className="github-connection-state">
            <span className="connection-check" aria-hidden="true">✓</span>
            <div><small>연결된 계정</small><strong>@{githubLogin || 'GitHub 관리자'}</strong></div>
            <AdminAccessButton className="button ghost" forcePrompt>키 변경</AdminAccessButton>
            <button type="button" className="button ghost" onClick={clearToken}>연결 해제</button>
          </div>
        ) : (
          <div className="github-connection-state disconnected">
            <span className="connection-check" aria-hidden="true">!</span>
            <div><small>연결되지 않음</small><strong>GitHub 키를 입력해 시작하세요</strong></div>
            <AdminAccessButton className="button primary">GitHub 연결</AdminAccessButton>
          </div>
        )}
      </div>
      <StatusBanner tone="warning" title="신뢰할 수 있는 관리자 기기에서만 사용하세요.">토큰 권한은 이 저장소의 Contents: Read and write로 최소화하세요. 브라우저 입력 방식은 완전한 보안 격리를 제공하지 않습니다.</StatusBanner>

      <div className="admin-subheading"><h2>게시된 설문</h2><span>{surveys.length}개</span></div>
      {demo && <StatusBanner tone="info">data 브랜치 설문 목록을 아직 읽을 수 없어 데모 설문을 표시합니다.</StatusBanner>}
      {loading ? <Loading /> : (
        <div className="admin-list">
          {surveys.map((survey) => (
            <article key={survey.surveyId}>
              <div><span className="card-kicker">{survey.courseName} · {survey.cohort}</span><h3>{survey.title}</h3><p>{survey.surveyId} · revision {survey.revision}</p></div>
              <div className="compact-actions"><Link className="button ghost" to={`/s/${survey.surveyId}`}>학생 화면</Link><Link className="button ghost" to={`/admin/surveys/new?clone=${survey.surveyId}`}>복제</Link><Link className="button ghost" to={`/admin/surveys/${survey.surveyId}/results`}>결과 분석</Link>{!demo && <Link className="button secondary" to={`/admin/surveys/${survey.surveyId}`}>편집</Link>}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
