import { useLocation, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

type Crumb = { label: string; to?: string }

function buildBreadcrumbs(pathname: string): Crumb[] {
  if (pathname === '/') return [{ label: '홈' }]

  const segments = pathname.split('/').filter(Boolean)
  const root = segments[0]

  if (root === 'orders') {
    const crumbs: Crumb[] = [{ label: '발주서', to: '/orders' }]
    if (segments.length >= 3) {
      const sub = segments[2]
      const subLabels: Record<string, string> = {
        upload: '주문 업로드',
        allocation: '공급처 배정',
        download: '발주서 다운로드',
      }
      if (sub && subLabels[sub]) crumbs.push({ label: subLabels[sub] })
    }
    return crumbs
  }

  if (root === 'tracking') {
    const crumbs: Crumb[] = [{ label: '운송장', to: '/tracking' }]
    if (segments.length >= 3) {
      const sub = segments[2]
      const subLabels: Record<string, string> = {
        upload: '운송장 업로드',
        match: '매칭 결과',
        download: '플랫폼 다운로드',
      }
      if (sub && subLabels[sub]) crumbs.push({ label: subLabels[sub] })
    }
    return crumbs
  }

  if (root === 'mapping') {
    const crumbs: Crumb[] = [{ label: '매핑관리', to: '/mapping' }]
    const sub = segments[1]
    const subLabels: Record<string, string> = {
      suppliers: '공급처 관리',
      products: '품목 매핑',
      names: '상품명 변환',
      couriers: '택배사 매핑',
      dictionary: '과일 사전',
    }
    if (sub && subLabels[sub]) {
      crumbs.push({ label: subLabels[sub], to: `/mapping/${sub}` })
    }
    if (sub === 'suppliers' && segments.length >= 3) {
      crumbs.push({ label: '공급처 상세' })
    }
    return crumbs
  }

  if (root === 'settings') {
    const crumbs: Crumb[] = [{ label: '양식 관리' }]
    if (segments[1] === 'platform-template') {
      crumbs.push({ label: '운송장 양식' })
    }
    return crumbs
  }

  return [{ label: 'WithLab' }]
}

export function TopBar() {
  const { pathname } = useLocation()
  const crumbs = buildBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-card px-8">
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={14} className="text-t-mute" />}
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="text-t-secondary hover:text-t-strong transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-t-strong">
                  {crumb.label}
                </span>
              )}
            </span>
          )
        })}
      </nav>
      <div />
    </header>
  )
}
