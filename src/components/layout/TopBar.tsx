import { useLocation } from 'react-router-dom'

const ROUTE_TITLES: Record<string, string> = {
  '/': '홈',
  '/orders': '발주서',
  '/tracking': '운송장',
  '/mapping/suppliers': '공급처 관리',
  '/mapping/products': '품목 매핑',
  '/mapping/names': '상품명 변환',
  '/mapping/couriers': '택배사 매핑',
  '/settings/platform-template': '운송장 양식',
}

function getTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/mapping/suppliers/')) return '공급처 상세'
  return 'WithLab'
}

export function TopBar() {
  const { pathname } = useLocation()
  const title = getTitle(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-card px-8">
      <span className="text-base font-bold tracking-tight text-t-strong">
        {title}
      </span>
      <div />
    </header>
  )
}
