import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AdminAccessButton } from './AdminAccessButton'

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])
  return null
}

export function Layout() {
  const location = useLocation()
  return (
    <div className="app-shell">
      <ScrollToTop />
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="배움나침반 홈">
            <span className="brand-mark" aria-hidden="true"><i /><i /></span>
            <span><strong>배움나침반</strong><small>Smart Survey</small></span>
          </Link>
          <nav aria-label="주요 메뉴">
            <NavLink to="/" end>설문 참여</NavLink>
            <AdminAccessButton className={location.pathname.startsWith('/admin') ? 'active' : undefined}>관리자</AdminAccessButton>
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer>
        <div><strong>배움나침반</strong><p>더 정확한 시작을 위한 교육과정 사전 진단.</p></div>
        <p className="footer-note">Encrypted by design · Powered by GitHub & Cloudflare</p>
      </footer>
    </div>
  )
}
