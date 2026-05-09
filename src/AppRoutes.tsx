import { Routes, Route, Navigate } from 'react-router-dom'

import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PublicRoute } from '@/components/layout/PublicRoute'
import { AppLayout } from '@/components/layout/AppLayout'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Orders from '@/pages/orders/Orders'
import Tracking from '@/pages/tracking/Tracking'
import SupplierManage from '@/pages/mapping/SupplierManage'
import ProductMapping from '@/pages/mapping/ProductMapping'
import NameMapping from '@/pages/mapping/NameMapping'
import CourierMapping from '@/pages/mapping/CourierMapping'
import SupplierTemplate from '@/pages/settings/SupplierTemplate'
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
          <Route path="/orders" element={<Orders />} />
          <Route path="/tracking" element={<Tracking />} />

          <Route
            path="/mapping"
            element={<Navigate to="/mapping/suppliers" replace />}
          />
          <Route path="/mapping/suppliers" element={<SupplierManage />} />
          <Route path="/mapping/products" element={<ProductMapping />} />
          <Route path="/mapping/names" element={<NameMapping />} />
          <Route path="/mapping/couriers" element={<CourierMapping />} />

          <Route
            path="/settings"
            element={<Navigate to="/settings/supplier-template" replace />}
          />
          <Route
            path="/settings/supplier-template"
            element={<SupplierTemplate />}
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
