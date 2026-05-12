import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PublicRoute } from '@/components/layout/PublicRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MappingLayout } from '@/components/layout/MappingLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const WorkSessionSelector = lazy(() => import('@/pages/orders/WorkSessionSelector'))
const OrderUpload = lazy(() => import('@/pages/orders/OrderUpload'))
const SupplierAllocation = lazy(() => import('@/pages/orders/SupplierAllocation'))
const OrderDownload = lazy(() => import('@/pages/orders/OrderDownload'))
const TrackingSessionSelector = lazy(() => import('@/pages/tracking/TrackingSessionSelector'))
const TrackingUpload = lazy(() => import('@/pages/tracking/TrackingUpload'))
const TrackingMatchResult = lazy(() => import('@/pages/tracking/TrackingMatchResult'))
const TrackingDownload = lazy(() => import('@/pages/tracking/TrackingDownload'))
const SupplierManage = lazy(() => import('@/pages/mapping/SupplierManage'))
const SupplierDetail = lazy(() => import('@/pages/mapping/SupplierDetail'))
const ProductMapping = lazy(() => import('@/pages/mapping/ProductMapping'))
const NameMapping = lazy(() => import('@/pages/mapping/NameMapping'))
const CourierMapping = lazy(() => import('@/pages/mapping/CourierMapping'))
const FruitDictionary = lazy(() => import('@/pages/mapping/FruitDictionary'))
const PlatformTemplate = lazy(() => import('@/pages/settings/PlatformTemplate'))
const Guide = lazy(() => import('@/pages/Guide'))

function PageFallback() {
  return (
    <div className="flex justify-center py-20">
      <LoadingSpinner />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<WorkSessionSelector />} />
            <Route path="/orders/:sessionId/upload" element={<OrderUpload />} />
            <Route
              path="/orders/:sessionId/allocation"
              element={<SupplierAllocation />}
            />
            <Route
              path="/orders/:sessionId/download"
              element={<OrderDownload />}
            />
            <Route path="/tracking" element={<TrackingSessionSelector />} />
            <Route
              path="/tracking/:sessionId/upload"
              element={<TrackingUpload />}
            />
            <Route
              path="/tracking/:sessionId/match"
              element={<TrackingMatchResult />}
            />
            <Route
              path="/tracking/:sessionId/download"
              element={<TrackingDownload />}
            />

            <Route path="/mapping" element={<MappingLayout />}>
              <Route index element={<Navigate to="suppliers" replace />} />
              <Route path="suppliers" element={<SupplierManage />} />
              <Route path="suppliers/:id" element={<SupplierDetail />} />
              <Route path="products" element={<ProductMapping />} />
              <Route path="names" element={<NameMapping />} />
              <Route path="couriers" element={<CourierMapping />} />
              <Route path="dictionary" element={<FruitDictionary />} />
            </Route>

            <Route
              path="/settings"
              element={<Navigate to="/settings/platform-template" replace />}
            />
            <Route
              path="/settings/supplier-template"
              element={<Navigate to="/mapping/suppliers" replace />}
            />
            <Route
              path="/settings/platform-template"
              element={<PlatformTemplate />}
            />

            <Route path="/guide" element={<Guide />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
