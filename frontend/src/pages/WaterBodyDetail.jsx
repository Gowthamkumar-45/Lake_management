import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import LevelBar from '../components/LevelBar.jsx'
import { waterBodies as wbApi, workEntries, photos as photosApi, workforce as workforceApi, machines as machinesApi, funds as fundsApi, inflowSources as inflowApi, outflowSources as outflowApi } from '../services/api.js'
import { useApp } from '../context/AppContext.jsx'

function fmt(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ photos, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)

  const prev = useCallback(() => setIdx(i => (i - 1 + photos.length) % photos.length), [photos.length])
  const next = useCallback(() => setIdx(i => (i + 1) % photos.length), [photos.length])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  const photo = photos[idx]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>

      {/* Prev */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); prev() }}
          className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}

      {/* Image */}
      <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-3 px-16" onClick={e => e.stopPropagation()}>
        <img
          src={photo.image}
          alt={photo.caption || ''}
          className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
        />
        <div className="text-center">
          {photo.caption && <p className="text-white font-medium text-sm">{photo.caption}</p>}
          <p className="text-white/50 text-xs mt-0.5">
            {photo.officer && `By ${photo.officer} · `}{photo.phase && `${photo.phase} · `}{idx + 1} / {photos.length}
          </p>
        </div>
      </div>

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); next() }}
          className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-xs overflow-x-auto px-2">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === idx ? 'border-white scale-110' : 'border-white/20 opacity-60 hover:opacity-100'}`}
            >
              <img src={p.image} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PHOTO_COLORS = ['#0891b2','#0e6b86','#0c2a45','#0d9488','#1d4ed8','#7c3aed','#b45309']
function PhotoCard({ phase, label, color, index }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 group cursor-pointer">
      <div className="h-36 flex items-center justify-center relative" style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)` }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <svg className="w-12 h-12" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <span className="relative z-10 text-xs font-semibold px-2 py-1 rounded-full bg-white/70" style={{ color }}>
          {phase.toUpperCase()} — Photo {index + 1}
        </span>
      </div>
      <div className="p-2.5">
        <div className="text-xs font-medium text-gray-700">{label}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">Captured by field officer</div>
      </div>
    </div>
  )
}

// ─── Source Flow Map SVG ──────────────────────────────────────────────────────
function SourceFlowMap({ body, inflowList, outflowList }) {
  const W = 780, H = 280
  const cx = W / 2, cy = H / 2
  const tankR = 54

  const inCount  = inflowList.length
  const outCount = outflowList.length

  function inflowPos(i) {
    const total = inCount || 1
    const spread = Math.min((total - 1) * 60, H - 80)
    const yStart = cy - spread / 2
    return { x: 110, y: inCount === 1 ? cy : yStart + i * (spread / (total - 1 || 1)) }
  }
  function outflowPos(i) {
    const total = outCount || 1
    const spread = Math.min((total - 1) * 60, H - 80)
    const yStart = cy - spread / 2
    return { x: W - 110, y: outCount === 1 ? cy : yStart + i * (spread / (total - 1 || 1)) }
  }

  const COND_DOT = { good: '#16a34a', moderate: '#d97706', needs_repair: '#dc2626', silted: '#9333ea' }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
      <defs>
        <marker id="arrow-in" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 Z" fill="#3b82f6" />
        </marker>
        <marker id="arrow-out" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto">
          <path d="M8,0 L8,6 L0,3 Z" fill="#b45309" />
        </marker>
        <radialGradient id="tankGrad" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#cffafe" />
          <stop offset="100%" stopColor="#a5f3fc" />
        </radialGradient>
        <filter id="sf" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.12" />
        </filter>
        <style>{`
          @keyframes flowIn  { from { stroke-dashoffset: 20 } to { stroke-dashoffset: 0 } }
          @keyframes flowOut { from { stroke-dashoffset: 20 } to { stroke-dashoffset: 0 } }
          .flow-in  { animation: flowIn  1.4s linear infinite; }
          .flow-out { animation: flowOut 1.4s linear infinite; }
        `}</style>
      </defs>
      {Array.from({ length: 20 }, (_, i) => (
        <line key={`v${i}`} x1={i * 41} y1={0} x2={i * 41} y2={H} stroke="#e2e8f0" strokeWidth="0.5" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 40} x2={W} y2={i * 40} stroke="#e2e8f0" strokeWidth="0.5" />
      ))}
      {inflowList.map((src, i) => {
        const { x, y } = inflowPos(i)
        const inactive = src.status === 'inactive'
        return (
          <path key={src.id} className={inactive ? '' : 'flow-in'}
            d={`M${x + 58},${y} C${cx - 120},${y} ${cx - 120},${cy} ${cx - tankR},${cy}`}
            fill="none" stroke={inactive ? '#cbd5e1' : '#3b82f6'} strokeWidth="1.8" strokeDasharray="6 4"
            markerEnd={inactive ? undefined : 'url(#arrow-in)'} opacity={inactive ? 0.4 : 0.85} />
        )
      })}
      {outflowList.map((src, i) => {
        const { x, y } = outflowPos(i)
        const inactive = src.status === 'inactive'
        return (
          <path key={src.id} className={inactive ? '' : 'flow-out'}
            d={`M${cx + tankR},${cy} C${cx + 120},${cy} ${cx + 120},${y} ${x - 58},${y}`}
            fill="none" stroke={inactive ? '#cbd5e1' : '#b45309'} strokeWidth="1.8" strokeDasharray="6 4"
            markerEnd={inactive ? undefined : 'url(#arrow-out)'} opacity={inactive ? 0.4 : 0.85} />
        )
      })}
      {inflowList.length === 0 && (
        <text x={100} y={cy + 5} textAnchor="middle" fontSize="11" fill="#cbd5e1">No inflow</text>
      )}
      {outflowList.length === 0 && (
        <text x={W - 100} y={cy + 5} textAnchor="middle" fontSize="11" fill="#cbd5e1">No outflow</text>
      )}
      <circle cx={cx} cy={cy} r={tankR + 6} fill="white" opacity="0.6" />
      <circle cx={cx} cy={cy} r={tankR} fill="url(#tankGrad)" stroke="#67e8f9" strokeWidth="2" filter="url(#sf)" />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0e7490">{body.name?.split(' ').slice(0, 2).join(' ')}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#0891b2">{inCount} in · {outCount} out</text>
      {inflowList.map((src, i) => {
        const { x, y } = inflowPos(i)
        const dot = COND_DOT[src.condition] || '#64748b'
        return (
          <g key={src.id}>
            <rect x={x - 56} y={y - 14} width={112} height={28} rx={14} fill="white" stroke="#bfdbfe" strokeWidth="1.5" filter="url(#sf)" />
            <circle cx={x - 42} cy={y} r={5} fill={dot} />
            <text x={x - 32} y={y + 4} fontSize="11" fontWeight="500" fill="#1e40af">{src.name.length > 13 ? src.name.slice(0,12)+'…' : src.name}</text>
          </g>
        )
      })}
      {outflowList.map((src, i) => {
        const { x, y } = outflowPos(i)
        const dot = COND_DOT[src.condition] || '#64748b'
        return (
          <g key={src.id}>
            <rect x={x - 56} y={y - 14} width={112} height={28} rx={14} fill="white" stroke="#fed7aa" strokeWidth="1.5" filter="url(#sf)" />
            <circle cx={x - 42} cy={y} r={5} fill={dot} />
            <text x={x - 32} y={y + 4} fontSize="11" fontWeight="500" fill="#92400e">{src.name.length > 13 ? src.name.slice(0,12)+'…' : src.name}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Source card ──────────────────────────────────────────────────────────────
// SVG icon components for source types (no emoji)
function IconCatchment() { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0l-3-3m3 3 3-3M3 3.75h13.5"/></svg> }
function IconCanal()     { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10c2.5-4 11.5-4 14 0M3 14c2.5-4 11.5-4 14 0"/></svg> }
function IconRiver()     { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5c1.5 3 4 5 7 5s5.5-2 7-5M3 15c1.5-3 4-5 7-5s5.5 2 7 5"/></svg> }
function IconGround()    { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 10h12M4 14h12M8 6l2-3 2 3"/></svg> }
function IconSluice()    { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="6" y="4" width="8" height="12" rx="1"/><path strokeLinecap="round" strokeLinejoin="round" d="M10 4v12"/></svg> }
function IconStream()    { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7c1 2 3 3 5 3s4-2 5 0 3 3 4 3M3 13c1 2 3 3 5 3s4-2 5 0 3 3 4 3"/></svg> }
function IconWeir()      { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h14M10 5v10"/><path strokeLinecap="round" d="M10 10c0 2.5 3 4 3 4"/></svg> }
function IconDrain()     { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 3v14m-4-4 4 4 4-4"/></svg> }
function IconSupply()    { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h14M7 6l-4 4 4 4"/></svg> }
function IconFish()      { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 10c-3-4-9-4-12 0 3 4 9 4 12 0zM5 10l-3-3v6l3-3z"/></svg> }
function IconSeep()      { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 3c0 4-5 5-5 9a5 5 0 0010 0c0-4-5-5-5-9z"/></svg> }
function IconOther()     { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="10" cy="10" r="7"/></svg> }

const INFLOW_TYPE_ICON  = { catchment: IconCatchment, canal: IconCanal, river: IconRiver, groundwater: IconGround, sluice: IconSluice, stream: IconStream, other: IconOther }
const OUTFLOW_TYPE_ICON = { weir: IconWeir, canal: IconCanal, sluice: IconSluice, drain: IconDrain, supply: IconSupply, fisheries: IconFish, seepage: IconSeep, other: IconOther }
const COND_LABEL = { good: 'Good', moderate: 'Moderate', needs_repair: 'Needs repair', silted: 'Silted' }
const COND_CLASS = { good: 'bg-emerald-100 text-emerald-700', moderate: 'bg-amber-100 text-amber-700', needs_repair: 'bg-red-100 text-red-700', silted: 'bg-purple-100 text-purple-700' }
const DIR_LABEL  = { inflow: 'Inflow', bidirectional: 'Bidirectional', seasonal: 'Seasonal' }

function SourceCard({ src, isInflow, onEdit, onDelete }) {
  const IconComp = isInflow ? (INFLOW_TYPE_ICON[src.source_type] || IconOther) : (OUTFLOW_TYPE_ICON[src.outlet_type] || IconOther)
  const label = isInflow ? src.source_type?.replace('_', ' ') : src.outlet_type?.replace('_', ' ')
  const colorMap = { catchment:'#16a34a', canal:'#2563eb', river:'#0891b2', groundwater:'#7c3aed', sluice:'#ea580c', stream:'#0891b2', other:'#64748b', weir:'#2563eb', drain:'#dc2626', supply:'#0d9488', fisheries:'#0891b2', seepage:'#7c3aed' }
  const bgMap    = { catchment:'#f0fdf4', canal:'#eff6ff', river:'#f0f9ff', groundwater:'#faf5ff', sluice:'#fff7ed', stream:'#f0fdf4', other:'#f8fafc', weir:'#eff6ff', drain:'#fef2f2', supply:'#f0fdfa', fisheries:'#fffbeb', seepage:'#fdf4ff' }
  const typeKey  = isInflow ? src.source_type : src.outlet_type
  const bg       = bgMap[typeKey] || '#f8fafc'
  const color    = colorMap[typeKey] || '#64748b'
  const inactive = src.status === 'inactive'
  return (
    <div className={`card p-4 hover:shadow-md transition-shadow${inactive ? ' opacity-70' : ''}`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-gray-100" style={{ background: bg, color }}>
          <IconComp />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 text-sm leading-snug truncate">{src.name}</div>
              <div className="text-xs text-gray-400 capitalize mt-0.5">{label}</div>
            </div>
            <button onClick={() => onEdit(src)} className="shrink-0 w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 mt-3 ml-13" style={{ marginLeft: '52px' }}>
        {isInflow && src.direction && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            {DIR_LABEL[src.direction] || src.direction}
          </span>
        )}
        {src.condition && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${COND_CLASS[src.condition] || 'bg-gray-100 text-gray-600'}`}>
            {COND_LABEL[src.condition] || src.condition}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="mt-3 border-t border-gray-100" style={{ marginLeft: '52px' }} />

      {/* Connected / metrics + status row */}
      <div className="mt-3 flex items-end justify-between gap-2" style={{ marginLeft: '52px' }}>
        <div className="min-w-0">
          {src.connected_to && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Connected</div>
              <div className="text-xs font-semibold text-gray-700 truncate">{src.connected_to}</div>
            </div>
          )}
          {(src.length_km || src.ayacut_acres) && (
            <div className={`flex gap-3 text-xs text-gray-500${src.connected_to ? ' mt-1' : ''}`}>
              {src.length_km && <span><span className="font-semibold text-gray-700">{src.length_km} km</span> length</span>}
              {src.ayacut_acres && <span><span className="font-semibold text-gray-700">{src.ayacut_acres}</span> acres</span>}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {inactive
            ? <><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /><span className="text-xs text-gray-400 font-medium">Inactive</span></>
            : <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Active source</span></>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Source form modal ────────────────────────────────────────────────────────
function SourceFormModal({ isInflow, form, setForm, onSave, onCancel, saving, editing }) {
  const INFLOW_TYPES  = ['catchment','canal','river','groundwater','sluice','stream','other']
  const OUTFLOW_TYPES = ['weir','canal','sluice','drain','supply','fisheries','seepage','other']
  const CONDS = ['good','moderate','needs_repair','silted']
  const DIRS  = ['inflow','bidirectional','seasonal']
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-heading font-bold text-gray-800">{editing ? 'Edit' : 'Add'} {isInflow ? 'Inflow Source' : 'Outflow / Supply'}</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder={isInflow ? 'e.g. Vaigai Branch Canal' : 'e.g. South surplus weir'} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{isInflow ? 'Source type' : 'Outlet type'}</label>
              <select className="input" value={isInflow ? form.source_type : form.outlet_type} onChange={e => setForm(f => ({ ...f, [isInflow ? 'source_type' : 'outlet_type']: e.target.value }))}>
                {(isInflow ? INFLOW_TYPES : OUTFLOW_TYPES).map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="input" value={form.condition} onChange={e => setForm(f => ({...f, condition: e.target.value}))}>
                {CONDS.map(c => <option key={c} value={c}>{COND_LABEL[c]}</option>)}
              </select>
            </div>
          </div>
          {isInflow && (
            <div>
              <label className="label">Direction</label>
              <select className="input" value={form.direction} onChange={e => setForm(f => ({...f, direction: e.target.value}))}>
                {DIRS.map(d => <option key={d} value={d}>{DIR_LABEL[d]}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Connected to</label>
            <input className="input" placeholder="e.g. Vaigai Main Canal · Sathirakudi Eri" value={form.connected_to} onChange={e => setForm(f => ({...f, connected_to: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Length (km)</label>
              <input className="input" type="number" placeholder="e.g. 29" value={form.length_km} onChange={e => setForm(f => ({...f, length_km: e.target.value}))} />
            </div>
            <div>
              <label className="label">Ayacut (acres)</label>
              <input className="input" type="number" placeholder="e.g. 947" value={form.ayacut_acres} onChange={e => setForm(f => ({...f, ayacut_acres: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} placeholder="Any additional notes…" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
          </div>
          <div>
            <label className="label">Source status</label>
            <div className="flex rounded-xl overflow-hidden border border-gray-200 h-10">
              <button type="button"
                className="flex-1 text-sm font-semibold transition-all"
                style={form.status === 'active'
                  ? { background: '#10b981', color: '#fff' }
                  : { background: '#f3f4f6', color: '#9ca3af' }}
                onClick={() => setForm(f => ({...f, status: 'active'}))}>
                Active source
              </button>
              <button type="button"
                className="flex-1 text-sm font-semibold transition-all"
                style={form.status === 'inactive'
                  ? { background: '#ef4444', color: '#fff' }
                  : { background: '#f3f4f6', color: '#9ca3af' }}
                onClick={() => setForm(f => ({...f, status: 'inactive'}))}>
                Inactive
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onSave} disabled={saving || !form.name} className="btn-primary">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add source'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Water Source Tab component ───────────────────────────────────────────────
function WaterSourceTab({
  body, inflowList, outflowList,
  showAddInflow, setShowAddInflow, showAddOutflow, setShowAddOutflow,
  editingInflow, setEditingInflow, editingOutflow, setEditingOutflow,
  inflowForm, setInflowForm, outflowForm, setOutflowForm,
  sourceSaving, saveInflowSource, saveOutflowSource,
  deleteInflowSource, deleteOutflowSource, EMPTY_INFLOW, EMPTY_OUTFLOW,
}) {
  const lvl = body.water_level ?? 0
  const lvlColor = lvl >= 60 ? '#0891b2' : lvl >= 30 ? '#d97706' : '#dc2626'
  const linkedCanals = inflowList.filter(s => s.source_type === 'canal' && s.length_km)
  const linkedRivers = inflowList.filter(s => s.source_type === 'river' && s.length_km)

  const historyItems = [
    ...inflowList.map(s => ({ date: s.created_at, label: `Inflow source recorded: ${s.name}`, color: '#3b82f6' })),
    ...outflowList.map(s => ({ date: s.created_at, label: `Outflow recorded: ${s.name}`, color: '#b45309' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6)

  function fmtDate(d) {
    if (!d) return ''
    const dt = new Date(d)
    return isNaN(dt) ? '' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-5">
      {/* Stats hero */}
      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ background: 'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 50%,#f0fdf4 100%)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 px-6 pt-5 pb-3">
          {[
            { label: 'Catchment Area', value: body.catchment_area || '—', Icon: IconCatchment, color: '#0284c7', bg: '#e0f2fe' },
            { label: 'Inflow Sources',  value: inflowList.length  || '—', unit: inflowList.length  === 1 ? 'source'  : 'sources',  Icon: IconStream,    color: '#2563eb', bg: '#dbeafe' },
            { label: 'Outflow / Usage', value: outflowList.length || '—', unit: outflowList.length === 1 ? 'channel' : 'channels', Icon: IconWeir,      color: '#0d9488', bg: '#ccfbf1' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.color }}><s.Icon /></div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</div>
                <div className="font-heading font-bold text-lg leading-tight" style={{ color: s.color }}>{s.value}</div>
                {s.unit && <div className="text-[10px] text-gray-400">{s.unit}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-gray-500">Current Water Level</span>
            <span className="font-bold" style={{ color: lvlColor }}>{lvl}%</span>
          </div>
          <div className="h-2.5 bg-white/60 rounded-full overflow-hidden border border-white/80">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${lvl}%`, background: `linear-gradient(90deg, ${lvlColor}88, ${lvlColor})` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>Dry</span><span>Medium</span><span>Full</span></div>
        </div>
      </div>

      {/* Source flow map */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-800 text-sm">Source flow map</h4>
            <p className="text-xs text-gray-400">Catchment, inlets and outlets connected to this water body</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-blue-600 font-medium">
              <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2"/></svg>
              Inflow
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 font-medium">
              <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#b45309" strokeWidth="2" strokeDasharray="4 2"/></svg>
              Outflow
            </span>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border border-gray-100" style={{ background: '#f8fbff' }}>
          <SourceFlowMap body={body} inflowList={inflowList} outflowList={outflowList} />
        </div>
      </div>

      {/* Inflow sources */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h4 className="font-semibold text-gray-800">Inflow sources</h4>
          </div>
          <button onClick={() => { setInflowForm(EMPTY_INFLOW); setShowAddInflow(true) }} className="btn-secondary text-sm gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add inflow source
          </button>
        </div>
        {inflowList.length === 0
          ? <div className="card p-8 text-center text-gray-300 text-sm">No inflow sources recorded yet. Click "Add inflow source" to begin.</div>
          : <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {inflowList.map(src => (
                <SourceCard key={src.id} src={src} isInflow
                  onEdit={s => { setEditingInflow(s); setInflowForm({ name: s.name, source_type: s.source_type, direction: s.direction, condition: s.condition, connected_to: s.connected_to||'', length_km: s.length_km||'', ayacut_acres: s.ayacut_acres||'', notes: s.notes||'', status: s.status||'active' }) }}
                  onDelete={deleteInflowSource} />
              ))}
            </div>
        }
      </div>

      {/* Outflow & supply */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <h4 className="font-semibold text-gray-800">Outflow &amp; supply</h4>
          </div>
          <button onClick={() => { setOutflowForm(EMPTY_OUTFLOW); setShowAddOutflow(true) }} className="btn-secondary text-sm gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add outflow source
          </button>
        </div>
        {outflowList.length === 0
          ? <div className="card p-8 text-center text-gray-300 text-sm">No outflow details recorded yet. Click "Add outflow source" to begin.</div>
          : <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {outflowList.map(src => (
                <SourceCard key={src.id} src={src} isInflow={false}
                  onEdit={s => { setEditingOutflow(s); setOutflowForm({ name: s.name, outlet_type: s.outlet_type, condition: s.condition, connected_to: s.connected_to||'', length_km: s.length_km||'', ayacut_acres: s.ayacut_acres||'', notes: s.notes||'', status: s.status||'active' }) }}
                  onDelete={deleteOutflowSource} />
              ))}
            </div>
        }
      </div>

      {/* Linked canals & source history */}
      {(linkedCanals.length > 0 || linkedRivers.length > 0 || historyItems.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {(linkedCanals.length > 0 || linkedRivers.length > 0) && (
            <div className="card p-5">
              <h4 className="font-semibold text-gray-800 text-sm mb-3">Linked canal &amp; river</h4>
              <div className="space-y-2">
                {[...linkedCanals, ...linkedRivers].map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                      {s.source_type === 'canal' ? <IconCanal /> : <IconRiver />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                        {s.condition !== 'good' && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${COND_CLASS[s.condition]}`}>{COND_LABEL[s.condition]}</span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-0.5 text-xs text-gray-500">
                        {s.length_km && <span><span className="font-semibold text-gray-700">{s.length_km} km</span> length</span>}
                        {s.ayacut_acres && <span><span className="font-semibold text-gray-700">{s.ayacut_acres}</span> acres ayacut</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {historyItems.length > 0 && (
            <div className="card p-5">
              <h4 className="font-semibold text-gray-800 text-sm">Source history</h4>
              <p className="text-xs text-gray-400 mb-3">Recent source &amp; connection events</p>
              <div className="space-y-2.5">
                {historyItems.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: h.color }} />
                    <div>
                      <div className="text-xs font-medium text-gray-700">{h.label}</div>
                      <div className="text-[10px] text-gray-400">{fmtDate(h.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(showAddInflow || editingInflow) && (
        <SourceFormModal isInflow form={inflowForm} setForm={setInflowForm}
          onSave={saveInflowSource} onCancel={() => { setShowAddInflow(false); setEditingInflow(null) }}
          saving={sourceSaving} editing={!!editingInflow} />
      )}
      {(showAddOutflow || editingOutflow) && (
        <SourceFormModal isInflow={false} form={outflowForm} setForm={setOutflowForm}
          onSave={saveOutflowSource} onCancel={() => { setShowAddOutflow(false); setEditingOutflow(null) }}
          saving={sourceSaving} editing={!!editingOutflow} />
      )}
    </div>
  )
}

export default function WaterBodyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useApp()
  const isFieldOfficer = user?.role === 'field'
  const canManageReno  = user?.role === 'admin' || user?.role === 'taluk'
  const [tab, setTab] = useState('timeline')
  const [body, setBody] = useState(null)
  const [works, setWorks] = useState([])
  const [realPhotos, setRealPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [renoSaving, setRenoSaving] = useState(false)
  const [renoStatus, setRenoStatus] = useState('')
  const [showAddWork, setShowAddWork] = useState(false)
  const [addWorkForm, setAddWorkForm] = useState({
    work_type: 'Desilting', title: '', description: '', status: 'In Progress',
    start_date: new Date().toISOString().slice(0,10), completion_date: '', progress: 0, officer: '',
  })
  const [addWorkSaving, setAddWorkSaving] = useState(false)
  const [wsForm, setWsForm] = useState({ inflow_sources: '', outflow_details: '', catchment_area: '' })
  const [wsSaving, setWsSaving] = useState(false)
  const [wsEditing, setWsEditing] = useState(false)
  const [inflowList, setInflowList] = useState([])
  const [outflowList, setOutflowList] = useState([])
  const [showAddInflow, setShowAddInflow] = useState(false)
  const [showAddOutflow, setShowAddOutflow] = useState(false)
  const [editingInflow, setEditingInflow] = useState(null)
  const [editingOutflow, setEditingOutflow] = useState(null)
  const [sourceSaving, setSourceSaving] = useState(false)
  const EMPTY_INFLOW  = { name: '', source_type: 'catchment', direction: 'inflow', condition: 'good', connected_to: '', length_km: '', ayacut_acres: '', notes: '', status: 'active' }
  const EMPTY_OUTFLOW = { name: '', outlet_type: 'canal', condition: 'good', connected_to: '', length_km: '', ayacut_acres: '', notes: '', status: 'active' }
  const [inflowForm, setInflowForm]   = useState(EMPTY_INFLOW)
  const [outflowForm, setOutflowForm] = useState(EMPTY_OUTFLOW)

  // ── Renovation resource panels ───────────────────────────────────────────────
  const [workforceList, setWorkforceList] = useState([])
  const [machinesList, setMachinesList] = useState([])
  const [fundsList, setFundsList] = useState([])
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [showAddMachine, setShowAddMachine] = useState(false)
  const [showAddFund, setShowAddFund] = useState(false)
  const [newWorker, setNewWorker] = useState({ role: '', count: '', gender: 'male' })
  const [newMachine, setNewMachine] = useState({ name: '', qty: '' })
  const [newFund, setNewFund] = useState({ label: '', amount: '' })
  const [resourceSaving, setResourceSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      wbApi.get(id),
      workEntries.list({ water_body: id }),
      photosApi.list({ water_body: id }),
      workforceApi.list({ water_body: id }),
      machinesApi.list({ water_body: id }),
      fundsApi.list({ water_body: id }),
      inflowApi.list({ water_body: id }),
      outflowApi.list({ water_body: id }),
    ]).then(([wb, we, ph, wf, mc, fn, inf, out]) => {
      setBody(wb)
      setRenoStatus(wb.reno_status || 'Renovation Pending')
      setWsForm({ inflow_sources: wb.inflow_sources || '', outflow_details: wb.outflow_details || '', catchment_area: wb.catchment_area || '' })
      setWorks(Array.isArray(we) ? we : (we.results || []))
      setRealPhotos(Array.isArray(ph) ? ph : (ph.results || []))
      setWorkforceList(Array.isArray(wf) ? wf : (wf.results || []))
      setMachinesList(Array.isArray(mc) ? mc : (mc.results || []))
      setFundsList(Array.isArray(fn) ? fn : (fn.results || []))
      setInflowList(Array.isArray(inf) ? inf : (inf.results || []))
      setOutflowList(Array.isArray(out) ? out : (out.results || []))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (!body) return <div className="text-center py-20 text-gray-400">Water body not found.</div>

  const closeLightbox = () => setLightbox(null)

  async function saveWaterSource(e) {
    e.preventDefault()
    setWsSaving(true)
    try {
      await wbApi.update(id, wsForm)
      setBody(b => ({ ...b, ...wsForm }))
      setWsEditing(false)
    } catch { alert('Failed to save') }
    finally { setWsSaving(false) }
  }

  async function saveInflowSource() {
    setSourceSaving(true)
    try {
      const payload = { ...inflowForm, water_body: Number(id), length_km: inflowForm.length_km || null, ayacut_acres: inflowForm.ayacut_acres || null }
      if (editingInflow) {
        const updated = await inflowApi.update(editingInflow.id, payload)
        setInflowList(l => l.map(x => x.id === updated.id ? updated : x))
        setEditingInflow(null)
      } else {
        const created = await inflowApi.create(payload)
        setInflowList(l => [...l, created])
        setShowAddInflow(false)
      }
      setInflowForm(EMPTY_INFLOW)
    } catch { alert('Failed to save') }
    finally { setSourceSaving(false) }
  }

  async function saveOutflowSource() {
    setSourceSaving(true)
    try {
      const payload = { ...outflowForm, water_body: Number(id), length_km: outflowForm.length_km || null, ayacut_acres: outflowForm.ayacut_acres || null }
      if (editingOutflow) {
        const updated = await outflowApi.update(editingOutflow.id, payload)
        setOutflowList(l => l.map(x => x.id === updated.id ? updated : x))
        setEditingOutflow(null)
      } else {
        const created = await outflowApi.create(payload)
        setOutflowList(l => [...l, created])
        setShowAddOutflow(false)
      }
      setOutflowForm(EMPTY_OUTFLOW)
    } catch { alert('Failed to save') }
    finally { setSourceSaving(false) }
  }

  async function deleteInflowSource(srcId) {
    if (!confirm('Remove this inflow source?')) return
    await inflowApi.delete(srcId)
    setInflowList(l => l.filter(x => x.id !== srcId))
  }

  async function deleteOutflowSource(srcId) {
    if (!confirm('Remove this outflow source?')) return
    await outflowApi.delete(srcId)
    setOutflowList(l => l.filter(x => x.id !== srcId))
  }

  const TABS = [
    { key: 'timeline',    label: 'Work Timeline',       icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
    { key: 'renovation',  label: 'Renovation Workflow',  icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg> },
    { key: 'watersource', label: 'Water Source',         icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707.707M1 12h1m20 0h1M4.22 19.778l.707-.707M18.364 5.636l.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"/></svg> },
  ]

  const RENO_STAGES = [
    { key: 'Renovation Pending',   label: 'Pending Assessment', Icon: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>, desc: 'Survey and assessment not yet started', color: 'gray' },
    { key: 'Under Renovation',     label: 'Under Renovation',   Icon: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>, desc: 'Renovation work currently in progress', color: 'blue' },
    { key: 'Renovation Complete',  label: 'Completed',           Icon: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, desc: 'All renovation work successfully completed', color: 'green' },
    { key: 'Encroachment',         label: 'Encroachment',        Icon: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>, desc: 'Water body affected by encroachment', color: 'orange' },
    { key: 'Disappeared',          label: 'Disappeared',         Icon: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>, desc: 'Water body no longer exists', color: 'red' },
  ]

  const RENO_COLOR = {
    gray:   { ring: 'ring-gray-300',   bg: 'bg-gray-100',   text: 'text-gray-600',   activeBg: 'bg-gray-500',   activeTxt: 'text-white' },
    blue:   { ring: 'ring-blue-300',   bg: 'bg-blue-50',    text: 'text-blue-700',   activeBg: 'bg-blue-600',   activeTxt: 'text-white' },
    green:  { ring: 'ring-green-300',  bg: 'bg-green-50',   text: 'text-green-700',  activeBg: 'bg-green-600',  activeTxt: 'text-white' },
    orange: { ring: 'ring-orange-300', bg: 'bg-orange-50',  text: 'text-orange-700', activeBg: 'bg-orange-500', activeTxt: 'text-white' },
    red:    { ring: 'ring-red-300',    bg: 'bg-red-50',     text: 'text-red-700',    activeBg: 'bg-red-600',    activeTxt: 'text-white' },
  }

  const RENO_TO_WORK = {
    'Renovation Pending':  'Pending',
    'Under Renovation':    'In Progress',
    'Renovation Complete': 'Completed',
    'Encroachment':        'Pending',
    'Disappeared':         'Pending',
  }

  async function saveRenoStatus(newStatus) {
    setRenoSaving(true)
    const workStatus = RENO_TO_WORK[newStatus] || 'Pending'
    try {
      await wbApi.update(id, { reno_status: newStatus, work_status: workStatus })
      setRenoStatus(newStatus)
      setBody(b => ({ ...b, reno_status: newStatus, work_status: workStatus }))
    } catch (e) {
      alert('Failed to update renovation status')
    } finally {
      setRenoSaving(false)
    }
  }

  async function handleAddWork(e) {
    e.preventDefault()
    if (!addWorkForm.title.trim()) return
    setAddWorkSaving(true)
    try {
      const payload = {
        water_body: Number(id),
        work_type: addWorkForm.work_type,
        title: addWorkForm.title,
        description: addWorkForm.description,
        status: addWorkForm.status,
        start_date: addWorkForm.start_date || null,
        completion_date: addWorkForm.completion_date || null,
        progress: Number(addWorkForm.progress),
        officer: addWorkForm.officer,
      }
      const created = await workEntries.create(payload)
      setWorks(prev => [created, ...prev])
      setShowAddWork(false)
      setAddWorkForm({ work_type: 'Desilting', title: '', description: '', status: 'In Progress', start_date: new Date().toISOString().slice(0,10), completion_date: '', progress: 0, officer: '' })
    } catch (e) {
      alert('Failed to save work entry')
    } finally {
      setAddWorkSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      {lightbox && <Lightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={closeLightbox} />}
      <button onClick={() => navigate('/water-bodies')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-accent transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to Register
      </button>

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              {body.wb_type === 'Lake'
                ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" stroke="#0e6b86" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                : body.wb_type === 'River'
                ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M2 8c2-4 4-6 6-6s4 4 6 4 4-3 6-4" stroke="#0e6b86" strokeWidth="1.6" strokeLinecap="round"/><path d="M2 14c2-4 4-6 6-6s4 4 6 4 4-3 6-4" stroke="#0e6b86" strokeWidth="1.6" strokeLinecap="round"/></svg>
                : body.wb_type === 'Canal'
                ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 18h16" stroke="#0e6b86" strokeWidth="1.6" strokeLinecap="round"/><path d="M4 6v12M20 6v12" stroke="#0e6b86" strokeWidth="1.6"/></svg>
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2.5c4 4.8 6.5 8 6.5 11.2A6.5 6.5 0 015.5 13.7C5.5 10.5 8 7.3 12 2.5Z" stroke="#0e6b86" strokeWidth="1.6"/></svg>
              }
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading font-bold text-xl text-gray-900">{body.name}</h1>
                <StatusBadge status={body.status} />
                <StatusBadge status={body.work_status} />
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                  {body.wb_id}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                  {body.village}{body.taluk_name ? `, ${body.taluk_name}` : ''}
                </span>
                <span>{body.wb_type}</span>
                {body.area && <span>{body.area}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-gray-500">Water Level</div>
            <div className="font-heading font-bold text-3xl" style={{ color: body.status === 'Full' ? '#0891b2' : body.status === 'Medium' ? '#d97706' : '#dc2626' }}>
              {body.water_level}%
            </div>
            <div className="w-36"><LevelBar level={body.water_level} status={body.status} showLabel={false} /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-gray-100">
          <div><div className="text-xs text-gray-400 mb-0.5">Last Inspection</div><div className="text-sm font-semibold text-gray-800">{fmt(body.last_inspection)}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Next Inspection</div><div className="text-sm font-semibold text-gray-800">{fmt(body.next_inspection)}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Taluk</div><div className="text-sm font-semibold text-gray-800">{body.taluk_name || '—'}</div></div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Reno Status</div>
            {(() => {
              const st = RENO_STAGES.find(s => s.key === body.reno_status)
              const clr = st ? { gray:'#64748b', blue:'#2563eb', green:'#16a34a', orange:'#d97706', red:'#dc2626' }[st.color] : '#64748b'
              return (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: clr }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: clr }} />
                  {body.reno_status}
                </span>
              )
            })()}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-accent text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'timeline' && (() => {
        const timelineWorks = works.filter(w => w.work_type === 'Inspection')
        return (
        <div>
          {timelineWorks.length === 0 && (
            <div className="card text-center py-10 text-gray-400 text-sm">No work entries recorded for this water body.</div>
          )}
          <div className="relative">
            {/* Vertical line — centered on the w-6 dot (dot left=0, width=24px → center at 12px) */}
            {timelineWorks.length > 1 && <div className="absolute top-8 bottom-8 w-0.5 bg-gray-200 z-0" style={{ left: '11px' }} />}
            <div className="space-y-4">
              {timelineWorks.map((w, i) => {
                // Parse description fields
                const lines = (w.description || '').split('\n\n')
                const descLine = lines.find(l => !l.startsWith('Issues:') && !l.startsWith('Recommendation:') && !l.startsWith('GPS:')) || w.description
                const gpsLine = lines.find(l => l.startsWith('GPS:'))
                const gpsVal = gpsLine ? gpsLine.replace('GPS: ', '') : null
                const [gpsLat, gpsLon] = gpsVal ? gpsVal.split(', ') : ['', '']
                const issuesLine = lines.find(l => l.startsWith('Issues:'))

                // Work type color
                const typeColors = {
                  'Desilting':          { bg: 'bg-amber-100',   text: 'text-amber-700',  dot: '#d97706' },
                  'Bund strengthening': { bg: 'bg-blue-100',    text: 'text-blue-700',   dot: '#1d4ed8' },
                  'Sluice Renovation':  { bg: 'bg-purple-100',  text: 'text-purple-700', dot: '#7c3aed' },
                  'Canal Work':         { bg: 'bg-cyan-100',    text: 'text-cyan-700',   dot: '#0891b2' },
                  'Inspection':         { bg: 'bg-green-100',   text: 'text-green-700',  dot: '#16a34a' },
                }
                const tc = typeColors[w.work_type] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: '#6b7280' }

                // Photos linked to this specific work entry
                const entryPhotos = realPhotos.filter(p => p.work_entry === w.id)

                return (
                  <div key={w.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 shrink-0 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center mt-2 shadow-sm"
                      style={{ borderColor: tc.dot }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: tc.dot }} />
                    </div>

                    {/* Card */}
                    <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-1">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl ${tc.bg} flex items-center justify-center shrink-0`}>
                            {w.work_type === 'Desilting' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke={tc.dot} strokeWidth="2" strokeLinecap="round"/></svg>
                            )}
                            {w.work_type === 'Bund strengthening' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="1" stroke={tc.dot} strokeWidth="1.8"/><path d="M3 11l9-8 9 8" stroke={tc.dot} strokeWidth="1.8" strokeLinejoin="round"/></svg>
                            )}
                            {w.work_type === 'Sluice Renovation' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M5 8h14M5 16h14" stroke={tc.dot} strokeWidth="1.8" strokeLinecap="round"/></svg>
                            )}
                            {w.work_type === 'Inspection' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke={tc.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke={tc.dot} strokeWidth="1.8"/></svg>
                            )}
                            {!['Desilting','Bund strengthening','Sluice Renovation','Inspection'].includes(w.work_type) && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke={tc.dot} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-semibold text-gray-800">{w.title}</h3>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{w.work_type}</span>
                            </div>
                            {descLine && descLine !== w.description?.split('\n\n')[0] === false && (
                              <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xl">{descLine}</p>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${w.status === 'Completed' ? 'bg-green-100 text-green-700' : w.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: w.status === 'Completed' ? '#16a34a' : w.status === 'In Progress' ? '#1d4ed8' : '#6b7280' }} />
                          {w.status}
                        </span>
                      </div>

                      {/* Meta row — Visit Date + GPS only */}
                      <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-gray-50 text-sm">
                        <div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            Visit Date
                          </div>
                          <div className="font-semibold text-gray-700">{fmt(w.start_date) || '—'}</div>
                        </div>
                        {gpsVal ? (
                          <div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2.5c4 4.8 6.5 8 6.5 11.2A6.5 6.5 0 015.5 13.7C5.5 10.5 8 7.3 12 2.5Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                              GPS Location
                            </div>
                            <div className="font-mono text-xs text-gray-600 leading-relaxed">
                              {gpsLat}° N &nbsp; {gpsLon}° E
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2.5c4 4.8 6.5 8 6.5 11.2A6.5 6.5 0 015.5 13.7C5.5 10.5 8 7.3 12 2.5Z" stroke="currentColor" strokeWidth="2"/></svg>
                              GPS Location
                            </div>
                            <div className="text-gray-400 text-xs">Not recorded</div>
                          </div>
                        )}
                      </div>

                      {/* Issues */}
                      {issuesLine && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {issuesLine.replace('Issues: ', '').split(', ').map(issue => (
                            <span key={issue} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">{issue}</span>
                          ))}
                        </div>
                      )}

                      {/* Officer */}
                      {w.officer && (
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50">
                          <div className="w-9 h-9 rounded-full bg-accent/10 text-accent text-sm font-bold flex items-center justify-center shrink-0">
                            {w.officer.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-sm">{w.officer}</div>
                            <div className="text-xs text-gray-400">{w.work_type === 'Inspection' ? 'Field Inspector' : 'Work Supervisor'}</div>
                          </div>
                        </div>
                      )}

                      {/* Site photos linked to this entry */}
                      {entryPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
                          {entryPhotos.map((p, idx) => (
                            <button key={p.id} onClick={() => setLightbox({ photos: entryPhotos, index: idx })}
                              className="relative w-20 h-14 rounded-lg overflow-hidden border border-gray-200 group shrink-0">
                              <img src={p.image} alt={p.caption || 'site photo'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </button>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        )
      })()}


      {tab === 'renovation' && (() => {
        const STAGES = [
          { key: 'Renovation Pending',  label: 'Renovation Pending',  sub: 'Not yet started',        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, color: '#64748b', light: '#f1f5f9' },
          { key: 'Under Renovation',    label: 'Under Renovation',    sub: 'Work underway',          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, color: '#2563eb', light: '#eff6ff' },
          { key: 'Renovation Complete', label: 'Renovation Complete',  sub: 'All work done',          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/></svg>, color: '#16a34a', light: '#f0fdf4' },
          { key: 'Encroachment',        label: 'Encroachment',        sub: 'Unauthorized occupation', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.8"/><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>, color: '#d97706', light: '#fffbeb' },
          { key: 'Disappeared',         label: 'Disappeared',         sub: 'No longer exists',       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>, color: '#dc2626', light: '#fef2f2' },
        ]
        const activeSt = STAGES.find(s => s.key === renoStatus) || STAGES[0]

        const TYPE_CFG = {
          'Desilting':          { accent: '#d97706', bg: '#fef3c7', text: '#92400e' },
          'Bund strengthening': { accent: '#2563eb', bg: '#dbeafe', text: '#1e40af' },
          'Sluice Renovation':  { accent: '#7c3aed', bg: '#ede9fe', text: '#4c1d95' },
          'Canal Work':         { accent: '#0891b2', bg: '#cffafe', text: '#164e63' },
          'Inspection':         { accent: '#16a34a', bg: '#dcfce7', text: '#14532d' },
        }
        const STATUS_CFG = {
          'Completed':   { bg: '#dcfce7', text: '#15803d', bar: '#16a34a' },
          'In Progress': { bg: '#dbeafe', text: '#1d4ed8', bar: '#2563eb' },
          'Pending':     { bg: '#f3f4f6', text: '#4b5563', bar: '#9ca3af' },
        }

        const renoWorks = works.filter(w => w.work_type !== 'Inspection')
        const completedCount = renoWorks.filter(w => w.status === 'Completed').length
        const totalCount = renoWorks.length
        const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

        return (
        <div className="space-y-5">

          {/* ── Top row: Renovation Category + Workflow Progress ─────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Renovation Category */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-gray-800">Renovation category</h3>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-xs" style={{background: activeSt.light, color: activeSt.color}}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{background: activeSt.color}} />
                  {activeSt.label}
                  {renoSaving && <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                </div>
              </div>
              {canManageReno ? (
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(s => {
                    const active = s.key === renoStatus
                    return (
                      <button key={s.key} onClick={() => saveRenoStatus(s.key)} disabled={renoSaving}
                        className="px-3 py-1.5 rounded-xl border text-sm font-medium transition-all disabled:cursor-not-allowed"
                        style={active
                          ? { borderColor: s.color, background: s.color, color: '#fff' }
                          : { borderColor: '#e5e7eb', background: '#fff', color: '#6b7280' }
                        }>{s.label}</button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Only Admin / Taluk Officers can change the renovation stage.</p>
              )}
            </div>

            {/* Workflow Progress */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold text-gray-800">Workflow progress</span>
                <span className="text-sm font-bold text-gray-700">{completedCount}/{totalCount} stages</span>
              </div>
              <div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width: `${progressPct}%`, background: progressPct === 100 ? '#16a34a' : '#0e7490'}} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{progressPct}% complete</p>
              </div>
              {body.notes && (
                <div className="pt-3 border-t border-gray-50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{body.notes}</p>
                </div>
              )}
              <div className="pt-2">
                <button onClick={() => setShowAddWork(true)} className="btn-primary w-full justify-center text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Add Work Entry
                </button>
              </div>
            </div>
          </div>

          {/* ── Resource Panels ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Workforce */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-heading font-semibold text-gray-800">Workforce</span>
                {canManageReno && (
                  <button onClick={() => setShowAddWorker(true)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:border-accent hover:text-accent transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>
              <div className="flex gap-3 mb-4">
                <div className="flex-1 rounded-xl bg-blue-50 p-3">
                  <div className="text-[11px] font-semibold text-blue-500 mb-0.5">Male</div>
                  <div className="text-2xl font-bold text-blue-700">{workforceList.filter(w => w.gender === 'male').reduce((s, w) => s + w.count, 0)}</div>
                </div>
                <div className="flex-1 rounded-xl bg-pink-50 p-3">
                  <div className="text-[11px] font-semibold text-pink-500 mb-0.5">Female</div>
                  <div className="text-2xl font-bold text-pink-600">{workforceList.filter(w => w.gender === 'female').reduce((s, w) => s + w.count, 0)}</div>
                </div>
              </div>
              {workforceList.length === 0
                ? <p className="text-xs text-gray-300 text-center py-2">No workforce added yet</p>
                : <div className="space-y-2">
                    {workforceList.map((row) => (
                      <div key={row.id} className="flex items-center justify-between text-sm border-t border-gray-50 pt-2 first:border-0 first:pt-0">
                        <span className="text-gray-500">{row.role}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{row.count}</span>
                          {canManageReno && <button onClick={async () => { await workforceApi.delete(row.id); setWorkforceList(l => l.filter(x => x.id !== row.id)) }} className="text-gray-200 hover:text-red-400 transition-colors text-base leading-none">×</button>}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Machines & Equipment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-heading font-semibold text-gray-800">Machines & equipment</span>
                {canManageReno && (
                  <button onClick={() => setShowAddMachine(true)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:border-accent hover:text-accent transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>
              {machinesList.length === 0
                ? <p className="text-xs text-gray-300 text-center py-4">No machines added yet</p>
                : <div className="space-y-3">
                    {machinesList.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">× {m.qty}</span>
                          {canManageReno && <button onClick={async () => { await machinesApi.delete(m.id); setMachinesList(l => l.filter(x => x.id !== m.id)) }} className="text-gray-200 hover:text-red-400 transition-colors text-base leading-none">×</button>}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Funds Utilised */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-heading font-semibold text-gray-800">Funds utilised</span>
                {canManageReno && (
                  <button onClick={() => setShowAddFund(true)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:border-accent hover:text-accent transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>
              {fundsList.length === 0
                ? <p className="text-xs text-gray-300 text-center py-4">No fund entries yet</p>
                : <>
                    <div className="space-y-2">
                      {fundsList.map((f) => (
                        <div key={f.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                          <span className="text-gray-600">{f.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">₹{Number(f.amount).toFixed(1)} L</span>
                            {canManageReno && <button onClick={async () => { await fundsApi.delete(f.id); setFundsList(l => l.filter(x => x.id !== f.id)) }} className="text-gray-200 hover:text-red-400 transition-colors text-base leading-none">×</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold mt-3 pt-3 border-t border-gray-100">
                      <span className="text-gray-800">Total</span>
                      <span style={{ color: '#0e6b86' }}>₹{fundsList.reduce((s, f) => s + Number(f.amount), 0).toFixed(1)} L</span>
                    </div>
                  </>
              }
            </div>
          </div>

          {/* ── Resource Add Modals ──────────────────────────────────────── */}
          {showAddWorker && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddWorker(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="font-heading font-bold text-gray-800">Add Worker Category</h3>
                <div className="space-y-3">
                  <div><label className="label">Role / Category</label><input className="input" placeholder="e.g. Supervisors" value={newWorker.role} onChange={e => setNewWorker(w => ({...w, role: e.target.value}))} autoFocus /></div>
                  <div><label className="label">Count</label><input type="number" min="1" className="input" placeholder="0" value={newWorker.count} onChange={e => setNewWorker(w => ({...w, count: e.target.value}))} /></div>
                  <div>
                    <label className="label">Gender</label>
                    <select className="input" value={newWorker.gender} onChange={e => setNewWorker(w => ({...w, gender: e.target.value}))}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button className="btn-secondary flex-1" onClick={() => setShowAddWorker(false)}>Cancel</button>
                  <button className="btn-primary flex-1 justify-center" disabled={resourceSaving} onClick={async () => {
                    if (!newWorker.role || !newWorker.count) return
                    setResourceSaving(true)
                    try {
                      const created = await workforceApi.create({ water_body: Number(id), role: newWorker.role, count: Number(newWorker.count), gender: newWorker.gender })
                      setWorkforceList(l => [...l, created])
                      setNewWorker({ role: '', count: '', gender: 'male' })
                      setShowAddWorker(false)
                    } finally { setResourceSaving(false) }
                  }}>{resourceSaving ? 'Saving…' : 'Add'}</button>
                </div>
              </div>
            </div>
          )}

          {showAddMachine && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddMachine(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="font-heading font-bold text-gray-800">Add Machine / Equipment</h3>
                <div className="space-y-3">
                  <div><label className="label">Machine Name</label><input className="input" placeholder="e.g. Compactor" value={newMachine.name} onChange={e => setNewMachine(m => ({...m, name: e.target.value}))} autoFocus /></div>
                  <div><label className="label">Quantity</label><input type="number" min="1" className="input" placeholder="1" value={newMachine.qty} onChange={e => setNewMachine(m => ({...m, qty: e.target.value}))} /></div>
                </div>
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button className="btn-secondary flex-1" onClick={() => setShowAddMachine(false)}>Cancel</button>
                  <button className="btn-primary flex-1 justify-center" disabled={resourceSaving} onClick={async () => {
                    if (!newMachine.name || !newMachine.qty) return
                    setResourceSaving(true)
                    try {
                      const created = await machinesApi.create({ water_body: Number(id), name: newMachine.name, qty: Number(newMachine.qty) })
                      setMachinesList(l => [...l, created])
                      setNewMachine({ name: '', qty: '' })
                      setShowAddMachine(false)
                    } finally { setResourceSaving(false) }
                  }}>{resourceSaving ? 'Saving…' : 'Add'}</button>
                </div>
              </div>
            </div>
          )}

          {showAddFund && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddFund(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="font-heading font-bold text-gray-800">Add Fund Entry</h3>
                <div className="space-y-3">
                  <div><label className="label">Work Head</label><input className="input" placeholder="e.g. Inlet repair" value={newFund.label} onChange={e => setNewFund(f => ({...f, label: e.target.value}))} autoFocus /></div>
                  <div><label className="label">Amount (in Lakhs ₹)</label><input type="number" step="0.1" min="0" className="input" placeholder="0.0" value={newFund.amount} onChange={e => setNewFund(f => ({...f, amount: e.target.value}))} /></div>
                </div>
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button className="btn-secondary flex-1" onClick={() => setShowAddFund(false)}>Cancel</button>
                  <button className="btn-primary flex-1 justify-center" disabled={resourceSaving} onClick={async () => {
                    if (!newFund.label || newFund.amount === '') return
                    setResourceSaving(true)
                    try {
                      const created = await fundsApi.create({ water_body: Number(id), label: newFund.label, amount: Number(newFund.amount) })
                      setFundsList(l => [...l, created])
                      setNewFund({ label: '', amount: '' })
                      setShowAddFund(false)
                    } finally { setResourceSaving(false) }
                  }}>{resourceSaving ? 'Saving…' : 'Add'}</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Add Work Modal ──────────────────────────────────────────── */}
          {showAddWork && (
            <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddWork(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-lg text-gray-800">Add Work Entry</h3>
                  <button onClick={() => setShowAddWork(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
                <form onSubmit={handleAddWork} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="label">Work Title *</label>
                      <input className="input" placeholder="e.g. Tank-bed desilting" value={addWorkForm.title} onChange={e => setAddWorkForm(f=>({...f,title:e.target.value}))} autoFocus required />
                    </div>
                    <div>
                      <label className="label">Work Type</label>
                      <select className="input" value={addWorkForm.work_type} onChange={e => setAddWorkForm(f=>({...f,work_type:e.target.value}))}>
                        {['Desilting','Bund strengthening','Sluice Renovation','Canal Work','Inspection','Other'].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input" value={addWorkForm.status} onChange={e => setAddWorkForm(f=>({...f,status:e.target.value}))}>
                        {['Pending','In Progress','Completed'].map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Start Date</label>
                      <input type="date" className="input" value={addWorkForm.start_date} onChange={e => setAddWorkForm(f=>({...f,start_date:e.target.value}))} />
                    </div>
                    <div>
                      <label className="label">Completion Date</label>
                      <input type="date" className="input" value={addWorkForm.completion_date} onChange={e => setAddWorkForm(f=>({...f,completion_date:e.target.value}))} />
                    </div>
                    <div>
                      <label className="label">Officer / Contractor</label>
                      <input className="input" placeholder="Name" value={addWorkForm.officer} onChange={e => setAddWorkForm(f=>({...f,officer:e.target.value}))} />
                    </div>
                    <div>
                      <label className="label">Progress (%)</label>
                      <input type="number" min="0" max="100" className="input" value={addWorkForm.progress} onChange={e => setAddWorkForm(f=>({...f,progress:e.target.value}))} />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Description / Notes</label>
                      <textarea className="input min-h-20 resize-y" placeholder="Describe the work scope, observations..." value={addWorkForm.description} onChange={e => setAddWorkForm(f=>({...f,description:e.target.value}))} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2 border-t border-gray-100">
                    <button type="button" className="btn-secondary flex-1" onClick={() => setShowAddWork(false)}>Cancel</button>
                    <button type="submit" className="btn-primary flex-1 justify-center" disabled={addWorkSaving}>
                      {addWorkSaving ? 'Saving…' : 'Save Work Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Work Entries List ───────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-gray-700 text-sm">
                Work Entries
                <span className="ml-2 text-gray-400 font-normal">({renoWorks.length})</span>
              </h3>
            </div>

            {renoWorks.length === 0 ? (
              <div className="card text-center py-14 text-gray-400 space-y-2">
                <svg className="w-10 h-10 mx-auto text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                <p className="text-sm">No work entries yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {renoWorks.map((w, idx) => {
                  const lines = (w.description || '').split('\n\n')
                  const descLine = lines.find(l => !l.startsWith('Issues:') && !l.startsWith('Recommendation:') && !l.startsWith('GPS:')) || ''
                  const gpsLine = lines.find(l => l.startsWith('GPS:'))
                  const gpsVal = gpsLine ? gpsLine.replace('GPS: ', '') : null
                  const [gpsLat, gpsLon] = gpsVal ? gpsVal.split(', ') : ['','']
                  const issuesLine = lines.find(l => l.startsWith('Issues:'))
                  const tc = TYPE_CFG[w.work_type] || { accent: '#6b7280', bg: '#f3f4f6', text: '#374151' }
                  const sc = STATUS_CFG[w.status] || STATUS_CFG['Pending']
                  const entryPhotosReno = realPhotos.filter(p => p.work_entry === w.id)
                  const beforePhotos = entryPhotosReno.filter(p => p.phase === 'before')
                  const afterPhotos  = entryPhotosReno.filter(p => p.phase === 'after')

                  return (
                    <div key={w.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex overflow-hidden">
                      {/* Left accent stripe + number */}
                      <div className="w-12 shrink-0 flex flex-col items-center justify-start pt-5 gap-2" style={{background: tc.accent + '15'}}>
                        <span className="text-xs font-bold" style={{color: tc.accent}}>{String(idx+1).padStart(2,'0')}</span>
                        <div className="w-0.5 flex-1 rounded-full mx-auto" style={{background: tc.accent + '30'}} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5 space-y-3 min-w-0">
                        {/* Title + status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-heading font-semibold text-gray-800 leading-snug truncate">{w.title}</h4>
                            {descLine && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-1">{descLine}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{background: tc.bg, color: tc.text}}>{w.work_type}</span>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1" style={{background: sc.bg, color: sc.text}}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{background: sc.bar}} />
                              {w.status}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {w.progress > 0 && (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${w.progress}%`, background: w.progress===100?'#16a34a':tc.accent}} />
                            </div>
                            <span className="text-xs font-bold text-gray-500 w-9 text-right">{w.progress}%</span>
                          </div>
                        )}

                        {/* Meta chips */}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          {w.start_date && (
                            <span className="flex items-center gap-1">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              Start: <strong className="text-gray-700">{fmt(w.start_date)}</strong>
                            </span>
                          )}
                          {w.completion_date && (
                            <span className="flex items-center gap-1">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              End: <strong className="text-gray-700">{fmt(w.completion_date)}</strong>
                            </span>
                          )}
                          {gpsVal && (
                            <span className="flex items-center gap-1 font-mono">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2.5c4 4.8 6.5 8 6.5 11.2A6.5 6.5 0 015.5 13.7C5.5 10.5 8 7.3 12 2.5Z" stroke="currentColor" strokeWidth="2"/></svg>
                              {gpsLat}° N {gpsLon}° E
                            </span>
                          )}
                          {w.officer && (
                            <span className="flex items-center gap-1">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                              <strong className="text-gray-700">{w.officer}</strong>
                            </span>
                          )}
                        </div>

                        {/* Issues */}
                        {issuesLine && (
                          <div className="flex flex-wrap gap-1.5">
                            {issuesLine.replace('Issues: ','').split(', ').map(issue => (
                              <span key={issue} className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">{issue}</span>
                            ))}
                          </div>
                        )}

                        {/* Before / After photos — only for this entry */}
                        {entryPhotosReno.length > 0 && (
                          <div className="flex gap-2 pt-2 border-t border-gray-50">
                            {beforePhotos[0] && (
                              <button onClick={() => setLightbox({photos:entryPhotosReno, index:0})}
                                className="relative w-28 rounded-xl overflow-hidden border border-gray-200 group shrink-0" style={{height:72}}>
                                <img src={beforePhotos[0].image} alt="before" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-[9px] text-white font-bold text-center py-0.5 uppercase tracking-widest">Before</div>
                              </button>
                            )}
                            {afterPhotos[0] && (
                              <button onClick={() => setLightbox({photos:entryPhotosReno, index:entryPhotosReno.indexOf(afterPhotos[0])})}
                                className="relative w-28 rounded-xl overflow-hidden border border-gray-200 group shrink-0" style={{height:72}}>
                                <img src={afterPhotos[0].image} alt="after" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-[9px] text-white font-bold text-center py-0.5 uppercase tracking-widest">After</div>
                              </button>
                            )}
                            {entryPhotosReno.length > 2 && (
                              <button onClick={() => setLightbox({photos:entryPhotosReno, index:0})}
                                className="flex items-center gap-1.5 text-xs text-accent border border-accent/30 bg-accent/5 hover:bg-accent/10 px-3 rounded-xl transition-colors shrink-0">
                                +{entryPhotosReno.length - 2} more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        )
      })()}

      {/* ── Water Source Tab ─────────────────────────────────────────────── */}
      {tab === 'watersource' && (
        <WaterSourceTab
          body={body}
          id={id}
          inflowList={inflowList}
          outflowList={outflowList}
          setInflowList={setInflowList}
          setOutflowList={setOutflowList}
          showAddInflow={showAddInflow}
          setShowAddInflow={setShowAddInflow}
          showAddOutflow={showAddOutflow}
          setShowAddOutflow={setShowAddOutflow}
          editingInflow={editingInflow}
          setEditingInflow={setEditingInflow}
          editingOutflow={editingOutflow}
          setEditingOutflow={setEditingOutflow}
          inflowForm={inflowForm}
          setInflowForm={setInflowForm}
          outflowForm={outflowForm}
          setOutflowForm={setOutflowForm}
          sourceSaving={sourceSaving}
          saveInflowSource={saveInflowSource}
          saveOutflowSource={saveOutflowSource}
          deleteInflowSource={deleteInflowSource}
          deleteOutflowSource={deleteOutflowSource}
          EMPTY_INFLOW={EMPTY_INFLOW}
          EMPTY_OUTFLOW={EMPTY_OUTFLOW}
          wsForm={wsForm}
          setWsForm={setWsForm}
          wsSaving={wsSaving}
          saveWaterSource={saveWaterSource}
        />
      )}

    </div>
  )
}
