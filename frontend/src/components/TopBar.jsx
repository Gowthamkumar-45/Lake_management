import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { notifications as notifApi } from '../services/api.js'

const PAGE_META = {
  '/':             { title: 'District Command Centre', sub: 'Real-time overview · Ramanathapuram District' },
  '/explore':      { title: 'Explore Lakes & Ponds',  sub: 'Drill down by geography to find water bodies' },
  '/map':          { title: 'Map View',               sub: 'Water bodies by local body' },
  '/water-bodies': { title: 'Water Bodies Register',  sub: 'Manage and monitor all water bodies' },
  '/maintenance':  { title: 'Maintenance Schedule',   sub: 'Track works, schedules and activity' },
  '/field':        { title: 'Field Officer Portal',   sub: 'Submit GPS-tagged field updates' },
  '/reports':      { title: 'Reports & Analytics',    sub: 'District and taluk-wise performance' },
  '/master-data':  { title: 'Master Data',            sub: 'Manage geography hierarchy and register lakes' },
  '/users':        { title: 'User Management',        sub: 'Officers, roles and taluk assignments' },
}

function timeSince(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function TopBar({ onMenuClick }) {
  const { user } = useApp()
  const location = useLocation()
  const [notifs, setNotifs] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const bellRef = useRef(null)

  useEffect(() => {
    if (!user) return
    notifApi.list().then(d => setNotifs(Array.isArray(d) ? d : (d.results || []))).catch(() => {})
    const timer = setInterval(() => {
      notifApi.list().then(d => setNotifs(Array.isArray(d) ? d : (d.results || []))).catch(() => {})
    }, 30000)
    return () => clearInterval(timer)
  }, [user])

  useEffect(() => {
    function onClick(e) { if (bellRef.current && !bellRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = notifs.filter(n => !n.is_read).length

  async function markRead(id) {
    await notifApi.markRead(id)
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAll() {
    await notifApi.markAllRead()
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })))
  }

  const isDetail = location.pathname.startsWith('/water-bodies/') && location.pathname.length > 14
  const meta = isDetail
    ? { title: 'Water Body Detail', sub: 'Work timeline · Renovation workflow · Water source' }
    : (PAGE_META[location.pathname] || { title: 'WBMS', sub: 'Ramanathapuram District' })

  return (
    <header className="flex items-center gap-3 px-4 md:px-6 flex-shrink-0 sticky top-0 z-20"
      style={{ height: 66, background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2eaf2' }}>

      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 flex-shrink-0"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="#42566c" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Page title */}
      <div style={{ lineHeight: 1.2, minWidth: 0 }} className="flex-1 lg:flex-none">
        <div className="font-bold text-sm md:text-lg truncate" style={{ fontFamily: "'Libre Franklin'", color: '#0c2a45' }}>{meta.title}</div>
        <div className="hidden sm:block text-xs" style={{ color: '#7589a0' }}>{meta.sub}</div>
      </div>

      <div className="flex-1 hidden lg:block" />

      {/* Search — hidden on mobile */}
      <div className="relative hidden md:block" style={{ width: 280 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          style={{ position: 'absolute', left: 12, top: 10 }}>
          <circle cx="11" cy="11" r="6.5" stroke="#90a2b6" strokeWidth="1.8"/>
          <path d="m20 20-3.5-3.5" stroke="#90a2b6" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <input
          placeholder="Search water bodies, works…"
          style={{
            width: '100%', padding: '9px 14px 9px 36px',
            border: '1px solid #dce4ee', borderRadius: 10,
            background: '#f4f7fb', fontSize: 13, outline: 'none', color: '#0c2a45',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Notification bell */}
      <div ref={bellRef} style={{ position: 'relative' }}>
        <div onClick={() => setShowNotifs(v => !v)}
          style={{ width: 40, height: 40, borderRadius: 11, border: '1px solid #e2eaf2', display: 'grid', placeItems: 'center', cursor: 'pointer', background: '#fff', position: 'relative' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="#42566c" strokeWidth="1.7" strokeLinejoin="round"/>
            <path d="M10 19a2 2 0 0 0 4 0" stroke="#42566c" strokeWidth="1.7"/>
          </svg>
          {unread > 0 && (
            <span style={{ position: 'absolute', top: 7, right: 8, minWidth: 16, height: 16, borderRadius: 999, background: '#ef4444', border: '2px solid #fff', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>

        {showNotifs && (
          <div style={{ position: 'absolute', right: 0, top: 50, width: 320, background: '#fff', border: '1px solid #e2eaf2', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.10)', zIndex: 100, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#0c2a45' }}>Notifications</span>
              {unread > 0 && <button onClick={markAll} style={{ fontSize: 11, color: '#0e6b86', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No notifications</div>
              ) : notifs.slice(0, 15).map(n => (
                <div key={n.id} onClick={() => markRead(n.id)}
                  style={{ padding: '10px 16px', borderBottom: '1px solid #f9fafb', background: n.is_read ? '#fff' : '#f0f7ff', cursor: 'pointer', transition: 'background .15s' }}>
                  <div style={{ fontSize: 12.5, fontWeight: n.is_read ? 400 : 600, color: '#0c2a45', lineHeight: 1.4 }}>{n.title}</div>
                  {n.message && <div style={{ fontSize: 11.5, color: '#7589a0', marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>}
                  <div style={{ fontSize: 10.5, color: '#b0bec8', marginTop: 4 }}>{timeSince(n.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User chip */}
      <div className="hidden sm:flex items-center gap-2"
        style={{ padding: '5px 10px 5px 5px', border: '1px solid #e2eaf2', borderRadius: 11, background: '#fff' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#0ea5e9,#0d9488)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
          {user?.init || 'SK'}
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0c2a45' }}>{user?.short || 'District Admin'}</div>
          <div style={{ fontSize: 10.5, color: '#7589a0' }}>{user?.sub || 'Ramnad HQ'}</div>
        </div>
      </div>
      {/* Avatar only on xs */}
      <div className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#0ea5e9,#0d9488)' }}>
        {user?.init || 'SK'}
      </div>
    </header>
  )
}
