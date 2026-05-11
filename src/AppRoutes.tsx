import { Routes, Route, Navigate } from 'react-router-dom'

import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PublicRoute } from '@/components/layout/PublicRoute'
import { AppLayout } from '@/components/layout/AppLayout'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import WorkSessionSelector from '@/pages/orders/WorkSessionSelector'
import OrderUpload from '@/pages/orders/OrderUpload'
import SupplierAllocation from '@/pages/orders/SupplierAllocation'
import OrderDownload from '@/pages/orders/OrderDownload'
import TrackingSessionSelector from '@/pages/tracking/TrackingSessionSelector'
import TrackingUpload from '@/pages/tracking/TrackingUpload'
import TrackingMatchResult from '@/pages/tracking/TrackingMatchResult'
import TrackingDownload from '@/pages/tracking/TrackingDownload'
import SupplierManage from '@/pages/mapping/SupplierManage'
import SupplierDetail from '@/pages/mapping/SupplierDetail'
import ProductMapping from '@/pages/mapping/ProductMapping'
import NameMapping from '@/pages/mapping/NameMapping'
import CourierMapping from '@/pages/mapping/CourierMapping'
import PlatformTemplate from '@/pages/settings/PlatformTemplate'

export function AppRoutes() {
  return (
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

          <Route
            path="/mapping"
            element={<Navigate to="/mapping/suppliers" replace />}
          />
          <Route path="/mapping/suppliers" element={<SupplierManage />} />
          <Route path="/mapping/suppliers/:id" element={<SupplierDetail />} />
          <Route path="/mapping/products" element={<ProductMapping />} />
          <Route path="/mapping/names" element={<NameMapping />} />
          <Route path="/mapping/couriers" element={<CourierMapping />} />

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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
