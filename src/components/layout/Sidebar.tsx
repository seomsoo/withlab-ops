import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Truck,
  Building2,
  ArrowLeftRight,
  Replace,
  Package,
  FileSpreadsheet,
  FileUp,
  LogOut,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/ui/Logo'
import { ModeToggle } from '@/components/ModeToggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
}

type NavSection = {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: (NavItem | NavSection)[] = [
  { label: '대시보드', href: '/', icon: LayoutDashboard },
  {
    title: '주문 관리',
    items: [
      { label: '발주서', href: '/orders', icon: FileText },
      { label: '운송장', href: '/tracking', icon: Truck },
    ],
  },
  {
    title: '설정',
    items: [
      { label: '공급처 관리', href: '/mapping/suppliers', icon: Building2 },
      { label: '품목 매핑', href: '/mapping/products', icon: ArrowLeftRight },
      { label: '상품명 변환', href: '/mapping/names', icon: Replace },
      { label: '택배사 매핑', href: '/mapping/couriers', icon: Package },
      {
        label: '발주서 양식',
        href: '/settings/supplier-template',
        icon: FileSpreadsheet,
      },
      {
        label: '운송장 양식',
        href: '/settings/platform-template',
        icon: FileUp,
      },
    ],
  },
]

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavItemLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActivePath(pathname, item.href)
  const Icon = item.icon

  return (
    <Link
      to={item.href}
      className={
        active
          ? 'flex items-center gap-3 rounded-[10px] bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary transition-[background,color] duration-[120ms]'
          : 'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-t-mid transition-[background,color] duration-[120ms] hover:bg-gray-200 hover:text-t-strong'
      }
    >
      <Icon size={20} />
      <span>{item.label}</span>
    </Link>
  )
}

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      // signOut 내부에서 console.error 처리됨
    }
  }

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?'
  const displayName = user?.email?.split('@')[0] ?? ''

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-col border-r border-line bg-card">
      <div className="border-b border-line px-4 py-5">
        <Logo size="sm" showText showSub subText="과일 발주 시스템" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3.5">
        {NAV_SECTIONS.map((entry, i) => {
          if ('href' in entry) {
            return (
              <NavItemLink key={entry.href} item={entry} pathname={pathname} />
            )
          }

          const section = entry
          return (
            <div key={i} className={i > 0 ? 'mt-2' : ''}>
              <div className="px-3 pb-1.5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-t-faint">
                {section.title}
              </div>
              {section.items.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div className="mb-1 flex justify-start px-2.5">
          <ModeToggle />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-[10px] p-2.5 transition-colors hover:bg-gray-200">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-50 text-[13px] font-semibold text-primary">
                {initial}
              </div>
              <div className="flex-1 text-left">
                <div className="text-[13px] font-semibold text-t-strong">
                  {displayName}
                </div>
                <div className="text-[11px] text-t-mute">운영팀</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut size={16} />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
