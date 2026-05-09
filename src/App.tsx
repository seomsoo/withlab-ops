import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/hooks/AuthContext'
import { AppRoutes } from '@/AppRoutes'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
        <Toaster position="top-right" duration={3000} />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
