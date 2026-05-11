import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'

import { ThemeProvider } from '@/components/theme-provider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/hooks/AuthContext'
import { AppRoutes } from '@/AppRoutes'

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="withlab-theme">
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
          <Toaster position="top-right" duration={3000} />
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
