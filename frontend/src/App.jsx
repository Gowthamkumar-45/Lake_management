import React, { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useApp } from './context/AppContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import Toast from './components/Toast.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import WaterBodies from './pages/WaterBodies.jsx'
import WaterBodyDetail from './pages/WaterBodyDetail.jsx'
import Maintenance from './pages/Maintenance.jsx'
import FieldOfficer from './pages/FieldOfficer.jsx'
import Reports from './pages/Reports.jsx'
import Users from './pages/Users.jsx'
import MapView from './pages/MapView.jsx'
import MasterData from './pages/MasterData.jsx'
import Explore from './pages/Explore.jsx'

function ProtectedLayout({ children }) {
  const { role } = useApp()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!role) return <Navigate to="/login" replace state={{ from: location }} />
  if (role === 'field' && location.pathname !== '/field') {
    return <Navigate to="/field" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function RequireRole({ allowed, children }) {
  const { role } = useApp()
  if (!allowed.includes(role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { role, toastMsg, toastType, clearToast } = useApp()

  return (
    <>
      {toastMsg && <Toast msg={toastMsg} type={toastType} onClose={clearToast} />}
      <Routes>
        <Route path="/login" element={role ? <Navigate to={role === 'field' ? '/field' : '/'} replace /> : <Login />} />
        <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/explore" element={<ProtectedLayout><Explore /></ProtectedLayout>} />
        <Route path="/map" element={<ProtectedLayout><MapView /></ProtectedLayout>} />
        <Route path="/water-bodies" element={<ProtectedLayout><WaterBodies /></ProtectedLayout>} />
        <Route path="/water-bodies/:id" element={<ProtectedLayout><WaterBodyDetail /></ProtectedLayout>} />
        <Route path="/maintenance" element={<ProtectedLayout><Maintenance /></ProtectedLayout>} />
        <Route path="/field" element={<ProtectedLayout><FieldOfficer /></ProtectedLayout>} />
        <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
        <Route path="/users" element={
          <ProtectedLayout>
            <RequireRole allowed={['admin']}><Users /></RequireRole>
          </ProtectedLayout>
        } />
        <Route path="/master-data" element={
          <ProtectedLayout>
            <RequireRole allowed={['admin']}><MasterData /></RequireRole>
          </ProtectedLayout>
        } />
        <Route path="*" element={<Navigate to={role ? (role === 'field' ? '/field' : '/') : '/login'} replace />} />
      </Routes>
    </>
  )
}
