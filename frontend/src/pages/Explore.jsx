import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import LevelBar from '../components/LevelBar.jsx'
import MapCanvas from '../components/MapCanvas.jsx'
import { geo, waterBodies as wbApi, stats as statsApi } from '../services/api.js'

const TALUK_SVG = {
  'Ramanathapuram': <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" stroke="#0e6b86" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  'Paramakudi':     <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="14" rx="1.5" stroke="#0e6b86" strokeWidth="1.6"/><path d="M8 7V5a4 4 0 0 1 8 0v2" stroke="#0e6b86" strokeWidth="1.6"/><circle cx="12" cy="14" r="2" stroke="#0e6b86" strokeWidth="1.6"/></svg>,
  'Tiruvadanai':    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3 2 9l10 6 10-6-10-6Z" stroke="#0e6b86" strokeWidth="1.6" strokeLinejoin="round"/><path d="M2 15l10 6 10-6M2 12l10 6 10-6" stroke="#0e6b86" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  'Kamuthi':        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2.5c4 4.8 6.5 8 6.5 11.2A6.5 6.5 0 0 1 5.5 13.7C5.5 10.5 8 7.3 12 2.5Z" stroke="#0e6b86" strokeWidth="1.6"/></svg>,
  'Mudukulathur':   <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" stroke="#0e6b86" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 4v14M15 6v14" stroke="#0e6b86" strokeWidth="1.6"/></svg>,
  'Rajasingamangalam': <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="#0e6b86" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#0e6b86" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  'Kadaladi':       <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M2 12c2-4 4-6 6-6s4 4 6 4 4-3 6-4" stroke="#0e6b86" strokeWidth="1.6" strokeLinecap="round"/><path d="M2 17c2-4 4-6 6-6s4 4 6 4 4-3 6-4" stroke="#0e6b86" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  'Mandapam':       <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="#0e6b86" strokeWidth="1.6"/><circle cx="12" cy="10" r="2.5" stroke="#0e6b86" strokeWidth="1.6"/></svg>,
}
const LB_TYPE_SVG = {
  'Municipality':  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 11h2M13 11h2M9 15h2M13 15h2" stroke="#0e6b86" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  'Town Panchayat':<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V21H3V9.5Z" stroke="#0e6b86" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 21v-6h6v6" stroke="#0e6b86" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  'Panchayat':     <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M6 21V11M18 21V11M12 21V7" stroke="#0e6b86" strokeWidth="1.6" strokeLinecap="round"/><path d="M2 11h20M6 7h12" stroke="#0e6b86" strokeWidth="1.6"/><circle cx="12" cy="4" r="2" stroke="#0e6b86" strokeWidth="1.6"/></svg>,
}
const DEFAULT_SVG = <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="3" stroke="#0e6b86" strokeWidth="1.6"/><path d="M12 21s7-5 7-11a7 7 0 1 0-14 0c0 6 7 11 7 11Z" stroke="#0e6b86" strokeWidth="1.6"/></svg>

export default function Explore() {
  const navigate = useNavigate()
  const [selTaluk, setSelTaluk] = useState(null)
  const [selLBType, setSelLBType] = useState(null)
  const [selLB, setSelLB] = useState(null)
  const [search, setSearch] = useState('')

  const [taluks, setTaluks] = useState([])
  const [localBodies, setLocalBodies] = useState([])
  const [results, setResults] = useState([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [talukCounts, setTalukCounts] = useState({})

  useEffect(() => {
    Promise.all([geo.taluks(), geo.localBodies(), statsApi.get()])
      .then(([t, lb, stats]) => {
        setTaluks(Array.isArray(t) ? t : (t.results || []))
        setLocalBodies(Array.isArray(lb) ? lb : (lb.results || []))
        // Build taluk counts from stats API (accurate, no pagination issue)
        const counts = {}
        for (const ts of (stats.taluk_stats || [])) {
          counts[ts.name] = ts.total
        }
        setTalukCounts(counts)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selTaluk) { setResults([]); return }
    setLoadingResults(true)
    const params = { page_size: 500 }
    if (selTaluk) params.taluk = selTaluk
    if (selLB) params.local_body = selLB
    if (search) params.search = search
    wbApi.list(params)
      .then(d => setResults(Array.isArray(d) ? d : (d.results || [])))
      .catch(() => {})
      .finally(() => setLoadingResults(false))
  }, [selTaluk, selLB, search])

  const lbTypes = useMemo(() => {
    const lbs = selTaluk ? localBodies.filter(g => g.taluk_name === selTaluk) : localBodies
    return [...new Set(lbs.map(g => g.lb_type).filter(Boolean))]
  }, [selTaluk, localBodies])

  const lbs = useMemo(() => {
    return localBodies.filter(g => {
      if (selTaluk && g.taluk_name !== selTaluk) return false
      if (selLBType && g.lb_type !== selLBType) return false
      return true
    })
  }, [selTaluk, selLBType, localBodies])

  function resetFrom(level) {
    if (level <= 0) { setSelTaluk(null); setSelLBType(null); setSelLB(null) }
    else if (level <= 1) { setSelLBType(null); setSelLB(null) }
    else if (level <= 2) { setSelLB(null) }
  }

  const resultStats = {
    total: results.length,
    full: results.filter(b => b.status === 'Full').length,
    medium: results.filter(b => b.status === 'Medium').length,
    dry: results.filter(b => b.status === 'Dry').length,
  }

  return (
    <div className="animate-fade-in space-y-5">

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="flex items-center gap-1 text-accent font-medium hover:underline" onClick={() => resetFrom(0)}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          District
        </button>
        {selTaluk && (
          <>
            <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <button className="text-accent font-medium hover:underline" onClick={() => resetFrom(1)}>{selTaluk}</button>
          </>
        )}
        {selLBType && (
          <>
            <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <button className="text-accent font-medium hover:underline" onClick={() => resetFrom(2)}>{selLBType}</button>
          </>
        )}
        {selLB && (
          <>
            <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-600 font-medium">{selLB}</span>
          </>
        )}
      </div>

      {/* Full-width map — always visible */}
      <div className="card p-0 overflow-hidden" style={{ height: 380 }}>
        <MapCanvas bodies={results.length > 0 ? results : []} selectedTaluk={selTaluk} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-3 space-y-4">
          {/* Step 1: Taluk */}
          {!selTaluk && (
            <div className="card">
              <h2 className="font-heading font-semibold text-gray-700 mb-3">Select a Taluk</h2>
              {taluks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading taluks…</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {taluks.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelTaluk(t.name)}
                      className="p-4 rounded-xl border-2 border-gray-100 hover:border-accent hover:bg-accent/5 transition-all text-left group"
                    >
                      <div className="mb-2">{TALUK_SVG[t.name] || DEFAULT_SVG}</div>
                      <div className="font-semibold text-sm text-gray-800 group-hover:text-accent">{t.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{talukCounts[t.name] || 0} water bodies</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: LB Type */}
          {selTaluk && !selLBType && (
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => resetFrom(0)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <h2 className="font-heading font-semibold text-gray-700">
                  Select Local Body Type — <span className="text-accent">{selTaluk}</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {lbTypes.map(type => {
                  const count = localBodies.filter(g => g.lb_type === type && g.taluk_name === selTaluk).length
                  return (
                    <button
                      key={type}
                      onClick={() => setSelLBType(type)}
                      className="flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 border-gray-100 hover:border-accent hover:bg-accent/5 transition-all"
                    >
                      <span>{LB_TYPE_SVG[type] || <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V21H3V9.5Z" stroke="#0e6b86" strokeWidth="1.6" strokeLinejoin="round"/></svg>}</span>
                      <div className="text-left">
                        <div className="font-semibold text-gray-800">{type}</div>
                        <div className="text-xs text-gray-400">{count} local {count === 1 ? 'body' : 'bodies'}</div>
                      </div>
                    </button>
                  )
                })}
                {lbTypes.length === 0 && (
                  <div className="text-sm text-gray-400">No local bodies found for this taluk.</div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Local Body */}
          {selTaluk && selLBType && !selLB && (
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => resetFrom(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <h2 className="font-heading font-semibold text-gray-700">
                  Select Local Body — <span className="text-accent">{selLBType}</span> in {selTaluk}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lbs.map(lb => (
                  <button
                    key={lb.id}
                    onClick={() => setSelLB(lb.name)}
                    className="p-4 rounded-xl border-2 border-gray-100 hover:border-accent hover:bg-accent/5 transition-all text-left"
                  >
                    <div className="font-semibold text-gray-800">{lb.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{lb.lb_type}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {selTaluk && (
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {selLB && (
                    <button onClick={() => resetFrom(2)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                  <div>
                    <h2 className="font-semibold text-gray-700">Water Bodies</h2>
                    <p className="text-xs text-gray-400">
                      {loadingResults ? 'Loading…' : `${results.length} found in ${selLB || selTaluk}`}
                    </p>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input w-auto text-xs"
                />
              </div>
              {loadingResults ? (
                <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>
              ) : results.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No water bodies found for this selection.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {results.map(body => (
                    <div
                      key={body.id}
                      className="px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/water-bodies/${body.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{body.name}</span>
                            <StatusBadge status={body.status} size="xs" />
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{body.wb_id} · {body.wb_type} · {body.village}</div>
                          <div className="mt-1.5 w-32">
                            <LevelBar level={body.water_level} status={body.status} />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <StatusBadge status={body.work_status} size="xs" />
                          <div className="text-[10px] text-gray-400 mt-1">{body.area}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {selTaluk && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">{selLB || selTaluk} Stats</h3>
              <div className="space-y-2">
                {[
                  { label: 'Total', value: resultStats.total },
                  { label: 'Full', value: resultStats.full, color: '#0891b2' },
                  { label: 'Medium', value: resultStats.medium, color: '#d97706' },
                  { label: 'Dry', value: resultStats.dry, color: '#dc2626' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{s.label}</span>
                    <span className="font-semibold" style={{ color: s.color || '#1f2937' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
