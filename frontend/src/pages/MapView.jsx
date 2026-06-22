import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MapCanvas from '../components/MapCanvas.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import LevelBar from '../components/LevelBar.jsx'
import { waterBodies as wbApi, geo } from '../services/api.js'

const TYPES = ['Lake', 'Tank', 'Pond', 'River', 'Canal']
const STATUSES = ['Full', 'Medium', 'Dry']

export default function MapView() {
  const navigate = useNavigate()
  const [filterTaluk, setFilterTaluk] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedBody, setSelectedBody] = useState(null)
  const [bodies, setBodies] = useState([])
  const [taluks, setTaluks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Expose nav helper for Leaflet popup links (outside React tree)
    window.__wbNavTo = (path) => navigate(path)
    return () => { delete window.__wbNavTo }
  }, [navigate])

  useEffect(() => {
    Promise.all([geo.taluks(), wbApi.list({ page_size: 2000 })])
      .then(([t, d]) => {
        setTaluks(Array.isArray(t) ? t : (t.results || []))
        setBodies(Array.isArray(d) ? d : (d.results || []))
      }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return bodies.filter(b => {
      if (filterTaluk && b.taluk_name !== filterTaluk) return false
      if (filterType && b.wb_type !== filterType) return false
      if (filterStatus && b.status !== filterStatus) return false
      return true
    })
  }, [bodies, filterTaluk, filterType, filterStatus])

  const statusCounts = {
    Full: filtered.filter(b => b.status === 'Full').length,
    Medium: filtered.filter(b => b.status === 'Medium').length,
    Dry: filtered.filter(b => b.status === 'Dry').length,
  }

  return (
    <div className="animate-fade-in h-full flex flex-col gap-4" style={{ minHeight: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-heading font-bold text-xl text-gray-900">Map View</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} water bodies shown</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['Full', '#cff4f8', '#0891b2'], ['Medium', '#fdeecb', '#d97706'], ['Dry', '#fde0e0', '#dc2626']].map(([s, bg, c]) => (
            <div key={s} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border" style={{ background: bg, color: c, borderColor: `${c}40` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              {s}: {statusCounts[s]}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 shrink-0">
        <div className="flex flex-wrap gap-3">
          <select className="input w-auto" value={filterTaluk} onChange={e => setFilterTaluk(e.target.value)}>
            <option value="">All Taluks</option>
            {taluks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <select className="input w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          {(filterTaluk || filterType || filterStatus) && (
            <button className="btn-secondary" onClick={() => { setFilterTaluk(''); setFilterType(''); setFilterStatus('') }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4" style={{ minHeight: 0 }}>
        <div className="xl:col-span-2 card p-4">
          <div className="h-full rounded-lg overflow-hidden" style={{ minHeight: 360 }}>
            <MapCanvas bodies={filtered} selectedTaluk={filterTaluk} onSelectBody={setSelectedBody} />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Live OpenStreetMap · click any dot for details
          </p>
        </div>

        <div className="card p-0 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <h2 className="font-semibold text-sm text-gray-700">Water Bodies</h2>
            <p className="text-xs text-gray-400">{loading ? 'Loading…' : `${filtered.length} results`}</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">No matches</div>
            )}
            {filtered.map(body => (
              <div
                key={body.id}
                className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-blue-50/40 transition-colors ${selectedBody?.id === body.id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedBody(body)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-gray-800 truncate">{body.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{body.wb_id} · {body.wb_type} · {body.taluk_name}</div>
                    <div className="mt-1.5">
                      <LevelBar level={body.water_level} status={body.status} />
                    </div>
                  </div>
                  <StatusBadge status={body.status} size="xs" />
                </div>
                {selectedBody?.id === body.id && (
                  <div className="mt-2 pt-2 border-t border-blue-100">
                    <div className="flex gap-2">
                      <button
                        className="text-xs text-accent hover:underline font-medium"
                        onClick={e => { e.stopPropagation(); navigate(`/water-bodies/${body.id}`) }}
                      >
                        View Details →
                      </button>
                      <StatusBadge status={body.work_status} size="xs" />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{body.village} · {body.area}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
