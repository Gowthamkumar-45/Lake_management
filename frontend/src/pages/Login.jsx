import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

const ROLE_OPTIONS = [
  {
    key: 'admin',
    label: 'District Administrator',
    desc: 'Full access to every module, approvals & user management',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'taluk',
    label: 'Taluk Officer',
    desc: 'Manage water bodies & works within assigned taluk',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.7"/>
        <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.7"/>
      </svg>
    ),
  },
  {
    key: 'field',
    label: 'Field Officer',
    desc: 'On-site reporting only — capture photos, GPS & status',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7"/>
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7"/>
      </svg>
    ),
  },
  {
    key: 'auditor',
    label: 'Auditor',
    desc: 'Read-only access to dashboards, records & reports',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function Login() {
  const { login, toast } = useApp()
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState('admin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) { setError('Enter username and password'); return }
    setLoading(true)
    setError('')
    try {
      const data = await login(username, password)
      toast(`Welcome, ${data.name}!`, 'success')
      navigate(data.role === 'field' ? '/field' : '/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const accentFor = {
    admin: '#0e6b86', taluk: '#2563eb', field: '#0d9488', auditor: '#7c3aed',
  }
  const accent = accentFor[selectedRole]

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', background: '#06243d' }}>

      {/* ── Left brand panel ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg,#072a47 0%,#0a3a5e 55%,#0e6b86 130%)',
        color: '#eaf4fb', padding: '56px 60px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        {/* Radial glows */}
        <div style={{
          position: 'absolute', inset: 0, opacity: .5,
          backgroundImage: 'radial-gradient(circle at 18% 22%,rgba(56,189,248,.18),transparent 38%),radial-gradient(circle at 82% 78%,rgba(13,148,136,.22),transparent 42%)',
        }} />

        {/* Wave SVG */}
        <svg viewBox="0 0 600 200" preserveAspectRatio="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 230, opacity: .55 }}>
          <path d="M0 120 Q150 80 300 120 T600 120 V200 H0 Z" fill="rgba(56,189,248,.16)" />
          <path d="M0 145 Q150 110 300 150 T600 140 V200 H0 Z" fill="rgba(45,212,191,.16)" />
          <path d="M0 170 Q150 145 300 175 T600 165 V200 H0 Z" fill="rgba(14,165,233,.20)" />
        </svg>

        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.22)',
            display: 'grid', placeItems: 'center', backdropFilter: 'blur(4px)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2.5c4 4.8 6.5 8 6.5 11.2A6.5 6.5 0 0 1 5.5 13.7C5.5 10.5 8 7.3 12 2.5Z" fill="#7dd3fc"/>
              <path d="M9 13.2c0 1.7 1.3 3 3 3" stroke="#06243d" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8fc7e6', fontWeight: 600 }}>
              Government of Tamil Nadu
            </div>
            <div style={{ fontFamily: "'Libre Franklin'", fontWeight: 700, fontSize: 18 }}>
              Water Resources Department
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.18)',
            fontSize: 12.5, fontWeight: 600, color: '#bfe3f5', marginBottom: 22,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 0 4px rgba(52,211,153,.25)' }} />
            Ramanathapuram District · Smart Governance
          </div>
          <h1 style={{
            fontFamily: "'Libre Franklin'", fontWeight: 800, fontSize: 46,
            lineHeight: 1.06, margin: '0 0 18px', letterSpacing: '-.02em',
          }}>
            Water Bodies<br />Management System
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: '#bcd6e8', maxWidth: 430, margin: 0 }}>
            Monitor, maintain and protect every lake, pond, canal and kanmai across the district from a single command centre.
          </p>
          <div style={{ display: 'flex', gap: 30, marginTop: 34 }}>
            {[
              { val: '1,284', lbl: 'Water bodies' },
              { val: '8', lbl: 'Taluks' },
              { val: '412', lbl: 'Works in 2026' },
            ].map((s, i) => (
              <React.Fragment key={s.lbl}>
                {i > 0 && <div style={{ width: 1, background: 'rgba(255,255,255,.16)' }} />}
                <div>
                  <div style={{ fontFamily: "'Libre Franklin'", fontWeight: 700, fontSize: 28 }}>{s.val}</div>
                  <div style={{ fontSize: 12.5, color: '#8fb9d4', letterSpacing: '.04em' }}>{s.lbl}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', fontSize: 12.5, color: '#7ba7c4' }}>
          © 2026 District Administration, Ramanathapuram
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ background: '#f6f9fc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ fontFamily: "'Libre Franklin'", fontWeight: 700, fontSize: 25, marginBottom: 6, color: '#0c2a45' }}>
            Sign in to your account
          </div>
          <div style={{ color: '#64788f', fontSize: 14.5, marginBottom: 22 }}>
            Choose your role, then sign in to continue.
          </div>

          {/* Role cards */}
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#384a5e', marginBottom: 9 }}>Sign in as</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 22 }}>
            {ROLE_OPTIONS.map(opt => {
              const active = selectedRole === opt.key
              const ac = accentFor[opt.key]
              return (
                <div
                  key={opt.key}
                  onClick={() => setSelectedRole(opt.key)}
                  style={{
                    position: 'relative', cursor: 'pointer',
                    padding: '12px 12px 11px',
                    borderRadius: 12, border: `2px solid ${active ? ac : '#e2eaf2'}`,
                    background: active ? `${ac}08` : '#fff',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    transition: 'border-color .15s',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flex: 'none',
                    background: active ? `${ac}18` : '#eef3f9',
                    display: 'grid', placeItems: 'center',
                    color: active ? ac : '#7589a0',
                  }}>
                    {opt.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? ac : '#27384b', lineHeight: 1.2 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#7589a0', lineHeight: 1.3, marginTop: 2 }}>
                      {opt.desc}
                    </div>
                  </div>
                  {active && (
                    <span style={{
                      position: 'absolute', top: 9, right: 9,
                      width: 16, height: 16, borderRadius: '50%',
                      background: ac, display: 'grid', placeItems: 'center',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Username */}
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#384a5e', marginBottom: 7 }}>
            Username / Employee ID
          </label>
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              style={{ position: 'absolute', left: 13, top: 13 }}>
              <circle cx="12" cy="8" r="3.4" stroke="#7d93a8" strokeWidth="1.7"/>
              <path d="M5.5 19c.8-3.2 3.3-4.7 6.5-4.7s5.7 1.5 6.5 4.7" stroke="#7d93a8" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="RMD-AE-2041"
              style={{
                width: '100%', padding: '12px 14px 12px 40px',
                border: '1px solid #d3dde8', borderRadius: 10,
                fontSize: 14.5, background: '#fff', outline: 'none', color: '#0c2a45',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Password */}
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#384a5e', marginBottom: 7 }}>
            Password
          </label>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              style={{ position: 'absolute', left: 13, top: 13 }}>
              <rect x="5" y="10.5" width="14" height="9" rx="2.2" stroke="#7d93a8" strokeWidth="1.7"/>
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#7d93a8" strokeWidth="1.7"/>
            </svg>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '12px 14px 12px 40px',
                border: '1px solid #d3dde8', borderRadius: 10,
                fontSize: 14.5, background: '#fff', outline: 'none', color: '#0c2a45',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, fontSize: 13 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#52657a', cursor: 'pointer' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ accentColor: '#0e6b86', width: 15, height: 15 }} />
              Remember this device
            </label>
            <span style={{ color: '#0e6b86', fontWeight: 600, cursor: 'pointer' }}>Forgot password?</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: 13, border: 'none', borderRadius: 10,
              background: 'linear-gradient(180deg,#0e6b86,#0a526b)',
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(14,107,134,.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              opacity: loading ? .8 : 1,
            }}
          >
            {loading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Signing in…
              </>
            ) : (
              <>
                Sign in to dashboard
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h13m-5-5 5 5-5 5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: '#fde8e8', border: '1px solid #fca5a5', fontSize: 13, color: '#b91c1c', display: 'flex', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5M12 16h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}

          {/* Credentials hint */}
          <div style={{
            marginTop: 18, padding: '12px 14px', borderRadius: 10,
            background: '#eaf3f7', border: '1px solid #cfe5ec',
            fontSize: 12, color: '#3d6577',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Demo credentials</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
              <span><b>admin</b> / admin123 — District Admin</span>
              <span><b>auditor</b> / audit123 — Auditor</span>
              <span><b>rajesh</b> / officer123 — Taluk Officer</span>
              <span><b>anand</b> / officer123 — Field Officer</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
