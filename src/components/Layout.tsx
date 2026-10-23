import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])
  return null
}

export function Layout() {
  return (
    <div className="app-shell">
      <ScrollToTop />
      <header className="site-header">
        <Link to="/" className="brand" aria-label="배움나침반 홈">
          <span className="brand-mark" aria-hidden="true">⌁</span>
          <span><strong>배움나침반</strong><small>교육과정 사전 진단</small></span>
        </Link>
        <nav aria-label="주요 메뉴">
          <NavLink to="/" end>설문 참여</NavLink>
          <NavLink to="/admin">관리자</NavLink>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer>
        <div><strong>배움나침반</strong><p>학습자의 출발점을 알고, 더 나은 첫 수업을 준비합니다.</p></div>
        <p className="footer-note">GitHub Pages 기반 · 개인정보를 기본 수집하지 않습니다.</p>
      </footer>
    </div>
  )
}
