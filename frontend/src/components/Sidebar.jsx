import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { workEntries as weApi } from '../services/api.js'

const NAV_ITEMS = [
  {
    path: '/', label: 'Dashboard',
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/></svg>,
  },
  {
    path: '/explore', label: 'Explore Lakes',
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.7"/></svg>,
  },
  {
    path: '/water-bodies', label: 'Water Bodies',
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 2.5c4 4.8 6.5 8 6.5 11.2A6.5 6.5 0 0 1 5.5 13.7C5.5 10.5 8 7.3 12 2.5Z" stroke="currentColor" strokeWidth="1.7"/></svg>,
  },
  {
    path: '/maintenance', label: 'Maintenance', badge: null,
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    path: '/field', label: 'Field Updates',
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M23 7 16 12 23 17V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/></svg>,
  },
  {
    path: '/reports', label: 'Reports',
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  },
  {
    path: '/master-data', label: 'Master Data',
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="1.7"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="1.7"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke="currentColor" strokeWidth="1.7"/></svg>,
  },
  {
    path: '/users', label: 'User Management',
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user) return
    weApi.list({ ordering: '-created_at' }).then(data => {
      const all = Array.isArray(data) ? data : (data.results || [])
      setPendingCount(all.filter(e => e.status === 'Pending').length)
    }).catch(() => {})
  }, [user])

  // Close sidebar on route change (mobile)
  useEffect(() => { onClose?.() }, [location.pathname])

  const allowedNav = user?.nav || []
  const visibleItems = NAV_ITEMS.filter(item => allowedNav.includes(item.path))

  function handleLogout() { logout(); navigate('/login') }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50
        flex flex-col h-screen flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      style={{
        width: 250,
        background: 'linear-gradient(185deg,#082743 0%,#08314f 100%)',
        color: '#c5d8e6',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '22px 22px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(125,211,252,.14)', border: '1px solid rgba(125,211,252,.25)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2.5c4 4.8 6.5 8 6.5 11.2A6.5 6.5 0 0 1 5.5 13.7C5.5 10.5 8 7.3 12 2.5Z" fill="#7dd3fc"/>
          </svg>
        </div>
        <div style={{ lineHeight: 1.2, flex: 1 }}>
          <div style={{ fontFamily: "'Libre Franklin'", fontWeight: 700, fontSize: 14.5, color: '#fff' }}>WBMS Ramnad</div>
          <div style={{ fontSize: 11, color: '#6f97b3', letterSpacing: '.05em' }}>Water Resources Dept.</div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Nav */}
      <div style={{ padding: '16px 14px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '.13em', textTransform: 'uppercase', color: '#5d7e95', padding: '6px 12px 10px', fontWeight: 600 }}>
          Main menu
        </div>
        {visibleItems.map(item => {
          const active = isActive(item.path)
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                background: active ? 'rgba(255,255,255,.10)' : 'transparent',
                color: active ? '#fff' : '#8fb0c8',
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.06)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              {active && (
                <span style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: '#38bdf8' }} />
              )}
              <span style={{ flexShrink: 0, color: active ? '#7dd3fc' : 'currentColor' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: active ? 600 : 400 }}>{item.label}</span>
              {item.path === '/maintenance' && pendingCount > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 700, background: '#0e6b86', color: '#fff', padding: '2px 7px', borderRadius: 999, minWidth: 20, textAlign: 'center' }}>
                  {pendingCount}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* User profile */}
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 11, background: 'rgba(255,255,255,.05)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#0d9488)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {user?.init || 'SK'}
          </div>
          <div style={{ flex: 1, lineHeight: 1.25, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#eaf4fb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'S. Karthikeyan'}</div>
            <div style={{ fontSize: 11, color: '#6f97b3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.short || 'District Admin'}</div>
          </div>
          <svg onClick={handleLogout} width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', flexShrink: 0, color: '#8fb1c8' }}>
            <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M9 12h11m-3-3 3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </aside>
  )
}
