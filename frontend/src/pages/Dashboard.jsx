import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { stats as statsApi, waterBodies as wbApi } from '../services/api.js'
import MapCanvas from '../components/MapCanvas.jsx'

// ── SVG icons (no emojis) ─────────────────────────────────────────────────────
const IconWater = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 2.5c4 4.8 6.5 8 6.5 11.2A6.5 6.5 0 0 1 5.5 13.7C5.5 10.5 8 7.3 12 2.5Z" stroke="currentColor" strokeWidth="1.7"/>
  </svg>
)
const IconWrench = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconClock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
)
const IconAlert = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>
)

// Reno category icons
const RenoIcons = {
  'Under Renovation':    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'Renovation Complete': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'Renovation Pending':  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  'Encroachment':        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>,
  'Disappeared':         <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
}

const RENO_STYLE = {
  'Under Renovation':    { fg:'#1d4ed8', bg:'#dbe7fe', bar:'#2563eb', grad:'linear-gradient(135deg,#fff 60%,#dbe7fe 100%)' },
  'Renovation Complete': { fg:'#15803d', bg:'#d8f3e2', bar:'#16a34a', grad:'linear-gradient(135deg,#fff 60%,#d8f3e2 100%)' },
  'Renovation Pending':  { fg:'#9a6207', bg:'#fbeecb', bar:'#d97706', grad:'linear-gradient(135deg,#fff 60%,#fbeecb 100%)' },
  'Encroachment':        { fg:'#b91c1c', bg:'#fde0e0', bar:'#dc2626', grad:'linear-gradient(135deg,#fff 60%,#fde0e0 100%)' },
  'Disappeared':         { fg:'#475569', bg:'#eef2f6', bar:'#64748b', grad:'linear-gradient(135deg,#fff 60%,#eef2f6 100%)' },
}

// Map pins data
const MAP_PINS = [
  { x:32, y:30, s:'Full'   }, { x:55, y:42, s:'Medium' }, { x:46, y:62, s:'Full' },
  { x:68, y:70, s:'Dry'   }, { x:24, y:58, s:'Medium' }, { x:74, y:38, s:'Full' }, { x:40, y:78, s:'Dry' },
]
const PIN_COLOR = { Full:'#0891b2', Medium:'#d97706', Dry:'#dc2626' }

const WORK_BADGE = {
  'Completed':    { fg:'#15803d', bg:'#d8f3e2' },
  'In Progress':  { fg:'#1d4ed8', bg:'#dbe7fe' },
  'Pending':      { fg:'#9a6207', bg:'#fbeecb' },
}
const STATUS_BADGE = {
  Full:   { fg:'#0e7490', bg:'#cff4f8' },
  Medium: { fg:'#b45309', bg:'#fdeecb' },
  Dry:    { fg:'#b91c1c', bg:'#fde0e0' },
}

// Simple SVG donut
function Donut({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const R = 15.9155, cx = 21, cy = 21, r = R
  const circ = 2 * Math.PI * r
  let offset = 0
  const slices = data.map(d => {
    const pct = d.count / total
    const dash = pct * circ
    const slice = { ...d, dash: `${dash} ${circ - dash}`, offset: -offset * circ }
    offset += pct
    return slice
  })
  return (
    <svg width="140" height="140" viewBox="0 0 42 42" style={{ transform:'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef3f8" strokeWidth="6"/>
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth="6"
          strokeDasharray={s.dash} strokeDashoffset={s.offset}/>
      ))}
    </svg>
  )
}

const TYPE_COLORS = ['#0891b2','#0d9488','#2563eb','#7c3aed','#d97706']
const RENO_CATS = ['Under Renovation','Renovation Complete','Renovation Pending','Encroachment','Disappeared']

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useApp()
  const scope = user?.scope

  const [data, setData] = useState(null)
  const [updates, setUpdates] = useState([])
  const [bodies, setBodies] = useState([])

  useEffect(() => {
    statsApi.get().then(setData).catch(() => {})
    statsApi.recentUpdates().then(setUpdates).catch(() => {})
    wbApi.list({ page_size: 2000 }).then(d => setBodies(Array.isArray(d) ? d : (d.results || []))).catch(() => {})
  }, [])

  const total = data?.total ?? 0
  const reno = data?.renovation ?? {}
  const renoCounts = {
    'Under Renovation': reno.under ?? 0,
    'Renovation Complete': reno.complete ?? 0,
    'Renovation Pending': reno.pending ?? 0,
    'Encroachment': reno.encroachment ?? 0,
    'Disappeared': reno.disappeared ?? 0,
  }
  const kpi = [
    { label:'Total Water Bodies',    value: total.toLocaleString(), delta:'District register',      deltaOk:true,  color:'#0891b2', bg:'#e0f5fb', Icon:IconWater  },
    { label:'Active Maintenance',    value: data?.active_maintenance ?? '—', delta:'Works in progress',   deltaOk:true,  color:'#2563eb', bg:'#dbe7fe', Icon:IconWrench },
    { label:'Completed Works',       value: data?.completed_works ?? '—',   delta:'All time',           deltaOk:true,  color:'#15803d', bg:'#d8f3e2', Icon:IconCheck  },
    { label:'Pending Works',         value: data?.pending_works ?? '—',     delta:'Awaiting start',     deltaOk:false, color:'#d97706', bg:'#fdeecb', Icon:IconClock  },
    { label:'Due Maintenance Alerts',value: data?.due_alerts ?? '—',        delta:'Action needed',      deltaOk:false, color:'#dc2626', bg:'#fde0e0', Icon:IconAlert  },
  ]
  const taluks = scope
    ? (data?.taluk_stats ?? []).filter(t => t.name === scope)
    : (data?.taluk_stats ?? [])
  const typeDist = (data?.type_dist ?? []).map((d, i) => ({ ...d, label: d.type, color: TYPE_COLORS[i % TYPE_COLORS.length] }))

  return (
    <div>

      {/* Scope banner */}
      {scope && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderRadius:12, background:'#eaf3f7', border:'1px solid #cfe5ec', marginBottom:16, fontSize:13, color:'#3d6577' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
            <circle cx="12" cy="12" r="9" stroke="#3d8ba3" strokeWidth="1.7"/>
            <path d="M12 11v5M12 8h.01" stroke="#3d8ba3" strokeWidth="1.9" strokeLinecap="round"/>
          </svg>
          <span>You are viewing data scoped to <b style={{color:'#0c2a45'}}>{scope} Taluk</b>. Other taluks are managed by their respective officers.</span>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="dash-kpi-grid" style={{ marginBottom:20 }}>
        {kpi.map(k => (
          <div key={k.label} style={{ background:'#fff', border:'1px solid #e6edf5', borderRadius:15, padding:'17px 17px 16px', boxShadow:'0 1px 2px rgba(15,40,70,.04)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:16, right:16, width:38, height:38, borderRadius:10, background:k.bg, display:'grid', placeItems:'center', color:k.color }}>
              <k.Icon />
            </div>
            <div style={{ fontFamily:"'Libre Franklin'", fontWeight:700, fontSize:28, color:'#0c2a45', lineHeight:1, marginBottom:5 }}>{k.value}</div>
            <div style={{ fontSize:12.5, color:'#6a7e94', fontWeight:500 }}>{k.label}</div>
            <div style={{ fontSize:11.5, marginTop:6, color: k.deltaOk ? '#15803d' : '#dc2626', fontWeight:600 }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* ── Renovation category cards ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:11 }}>
        <div style={{ fontFamily:"'Libre Franklin'", fontWeight:700, fontSize:15.5, color:'#0c2a45' }}>Renovation status across the district</div>
        <div style={{ fontSize:12, color:'#7589a0' }}>Click a category to view those water bodies →</div>
      </div>
      <div className="dash-reno-grid" style={{ marginBottom:22 }}>
        {RENO_CATS.map(cat => {
          const st = RENO_STYLE[cat]
          const count = renoCounts[cat] ?? 0
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0
          return (
            <div
              key={cat}
              onClick={() => navigate(`/water-bodies?reno=${encodeURIComponent(cat)}`)}
              style={{ background:st.grad, border:'1px solid #e6edf5', borderRadius:15, padding:'16px 16px 14px', cursor:'pointer', boxShadow:'0 1px 3px rgba(15,40,70,.05)', transition:'box-shadow .15s, transform .15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 22px rgba(15,40,70,.12)'; e.currentTarget.style.transform='translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 3px rgba(15,40,70,.05)'; e.currentTarget.style.transform='none' }}
            >
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:'#fff', display:'grid', placeItems:'center', color:st.fg, boxShadow:'0 1px 4px rgba(15,40,70,.08)' }}>
                  {RenoIcons[cat]}
                </div>
                <div style={{ fontFamily:"'Libre Franklin'", fontWeight:800, fontSize:26, color:st.fg, lineHeight:1 }}>{count}</div>
              </div>
              <div style={{ fontSize:12.5, color:'#27384b', fontWeight:700, lineHeight:1.25 }}>{cat}</div>
              <div style={{ fontSize:11, color:'#7589a0', marginTop:2 }}>{pct}% of bodies</div>
              <div style={{ marginTop:10, height:4, borderRadius:4, background:'rgba(0,0,0,.07)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.max(pct, count > 0 ? 8 : 0)}%`, borderRadius:4, background:st.bar, transition:'width .4s' }}/>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Map + Taluk stats ── */}
      <div className="dash-bottom-grid" style={{ marginBottom:18 }}>

        {/* District map */}
        <div style={{ background:'#fff', border:'1px solid #e6edf5', borderRadius:16, boxShadow:'0 1px 2px rgba(15,40,70,.04)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px 12px' }}>
            <div>
              <div style={{ fontFamily:"'Libre Franklin'", fontWeight:700, fontSize:15.5, color:'#0c2a45' }}>District Water Map</div>
              <div style={{ fontSize:12, color:'#7589a0' }}>Live status across 8 taluks</div>
            </div>
            <div style={{ display:'flex', gap:14, fontSize:11.5, color:'#52657a' }}>
              {['Full','Medium','Dry'].map(s => (
                <span key={s} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:9, height:9, borderRadius:'50%', background:PIN_COLOR[s], display:'inline-block' }}/>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div style={{ height:340, margin:'0 14px 14px', borderRadius:12, overflow:'hidden', position:'relative' }}>
            <MapCanvas bodies={bodies} />
            <div style={{ position:'absolute', left:14, bottom:14, background:'rgba(255,255,255,.92)', border:'1px solid #d6e6ed', borderRadius:10, padding:'9px 12px', fontSize:11.5, color:'#42566c', boxShadow:'0 4px 12px rgba(15,40,70,.08)', zIndex:1000, pointerEvents:'none' }}>
              <div style={{ fontWeight:700, color:'#0c2a45', marginBottom:2 }}>{data?.due_alerts ?? '—'} due alerts</div>
              across district this week
            </div>
          </div>
        </div>

        {/* Taluk-wise stats */}
        <div style={{ background:'#fff', border:'1px solid #e6edf5', borderRadius:16, boxShadow:'0 1px 2px rgba(15,40,70,.04)', padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontFamily:"'Libre Franklin'", fontWeight:700, fontSize:15.5, color:'#0c2a45' }}>Taluk-wise statistics</div>
              <div style={{ fontSize:12, color:'#7589a0' }}>Water bodies by status</div>
            </div>
            <div style={{ fontSize:11.5, color:'#0e6b86', fontWeight:600, cursor:'pointer' }}
              onClick={() => navigate('/water-bodies')}>View all</div>
          </div>
          {taluks.map(t => {
            const tot = t.total || 1
            return (
              <div key={t.name} style={{ marginBottom:13 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5 }}>
                  <span style={{ color:'#3a4d62', fontWeight:600 }}>{t.name}</span>
                  <span style={{ color:'#8195a8' }}>{t.total}</span>
                </div>
                <div style={{ display:'flex', height:8, borderRadius:6, overflow:'hidden', background:'#eef3f8' }}>
                  <span style={{ width:`${(t.full/tot)*100}%`, background:'#0891b2' }}/>
                  <span style={{ width:`${(t.medium/tot)*100}%`, background:'#d97706' }}/>
                  <span style={{ width:`${(t.dry/tot)*100}%`,   background:'#dc2626' }}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Type donut + Recent updates ── */}
      <div className="dash-bottom-grid">

        {/* Donut */}
        <div className="dash-donut-sticky" style={{ background:'#fff', border:'1px solid #e6edf5', borderRadius:16, boxShadow:'0 1px 2px rgba(15,40,70,.04)', padding:'16px 18px' }}>
          <div style={{ fontFamily:"'Libre Franklin'", fontWeight:700, fontSize:15.5, color:'#0c2a45', marginBottom:2 }}>Water body types</div>
          <div style={{ fontSize:12, color:'#7589a0', marginBottom:8 }}>District distribution</div>
          <div style={{ display:'flex', alignItems:'center', gap:18 }}>
            <div style={{ position:'relative', width:140, height:140, flexShrink:0 }}>
              <Donut data={typeDist} />
              <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Libre Franklin'", fontWeight:700, fontSize:21, color:'#0c2a45', lineHeight:1 }}>{total.toLocaleString()}</div>
                  <div style={{ fontSize:10.5, color:'#7589a0' }}>total</div>
                </div>
              </div>
            </div>
            <div style={{ flex:1 }}>
              {typeDist.map(d => (
                <div key={d.label} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
                  <span style={{ width:10, height:10, borderRadius:3, background:d.color, flexShrink:0 }}/>
                  <span style={{ flex:1, fontSize:13, color:'#3a4d62' }}>{d.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#0c2a45' }}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent field updates */}
        <div style={{ background:'#fff', border:'1px solid #e6edf5', borderRadius:16, boxShadow:'0 1px 2px rgba(15,40,70,.04)', padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontFamily:"'Libre Franklin'", fontWeight:700, fontSize:15.5, color:'#0c2a45' }}>Recent field updates</div>
            <div style={{ fontSize:11.5, color:'#0e6b86', fontWeight:600, cursor:'pointer' }} onClick={() => navigate('/field')}>Field portal →</div>
          </div>
          {updates.length === 0 && (
            <div style={{ textAlign:'center', color:'#a0aec0', padding:'24px 0', fontSize:13 }}>No recent updates</div>
          )}
          {updates.map((u, i) => {
            const wb = WORK_BADGE[u.status] || { fg:'#475569', bg:'#eef2f6' }
            const initials = u.officer.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()
            return (
              <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid #f0f4f8', alignItems:'center' }}>
                <div style={{ width:34, height:34, borderRadius:9, background:'#eef5f8', display:'grid', placeItems:'center', flexShrink:0, color:'#0e6b86', fontWeight:700, fontSize:12 }}>
                  {initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, color:'#27384b', lineHeight:1.4 }}>
                    <b style={{ color:'#0c2a45' }}>{u.officer}</b>{' '}{u.action}{' at '}
                    <b style={{ color:'#0c2a45' }}>{u.body}</b>
                  </div>
                  <div style={{ fontSize:11.5, color:'#8195a8', marginTop:2 }}>{u.taluk} · {u.time}</div>
                </div>
                <div style={{ flexShrink:0 }}>
                  <span style={{ fontSize:11.5, fontWeight:600, color:wb.fg, background:wb.bg, padding:'3px 9px', borderRadius:999 }}>{u.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes wbmsPing {
          0%   { transform: scale(.6); opacity: .9; }
          80%, 100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
