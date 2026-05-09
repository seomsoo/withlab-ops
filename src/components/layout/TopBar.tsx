import { useLocation } from 'react-router-dom'

const ROUTE_TITLES: Record<string, string> = {
  '/': '홈',
  '/orders': '발주서',
  '/tracking': '운송장',
  '/mapping/suppliers': '공급처 관리',
  '/mapping/products': '품목 매핑',
  '/mapping/names': '상품명 변환',
  '/mapping/couriers': '택배사 매핑',
  '/settings/supplier-template': '발주서 양식',
  '/settings/platform-template': '운송장 양식',
}

export function TopBar() {
  const { pathname } = useLocation()
  const title = ROUTE_TITLES[pathname] ?? 'WithLab'

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-card px-8">
      <span className="text-base font-bold tracking-tight text-t-strong">
        {title}
      </span>
      <div />
    </header>
  )
}
