export function Loading({ label = '불러오는 중입니다.' }: { label?: string }) {
  return <div className="loading" role="status"><span className="spinner" aria-hidden="true" />{label}</div>
}
