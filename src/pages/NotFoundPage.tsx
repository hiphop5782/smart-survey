import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <section className="page-section narrow empty-state large"><span>404</span><h1>페이지를 찾을 수 없습니다.</h1><p>주소를 다시 확인하거나 홈으로 돌아가세요.</p><Link className="button primary" to="/">홈으로 돌아가기</Link></section>
}
