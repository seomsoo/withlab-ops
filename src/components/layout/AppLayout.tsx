import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export function AppLayout() {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <Sidebar />
      <main className="flex min-w-0 flex-col">
        <TopBar />
        <div className="mx-auto w-full max-w-[1200px] flex-1 px-10 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
