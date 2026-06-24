import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import { workEntries as weApi, geo } from '../services/api.js'
import { useApp } from '../context/AppContext.jsx'

function fmt(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const today = new Date()
today.setHours(0, 0, 0, 0)

function isOverdue(entry) {
  if (entry.status === 'Completed') return false
  const d = entry.completion_date ? new Date(entry.completion_date) : null
  return d && d < today
}

const WORK_TYPE_COLORS = {
  'Inspection':         { bg: '#dcfce7', text: '#15803d' },
  'Desilting':          { bg: '#fef3c7', text: '#92400e' },
  'Bund strengthening': { bg: '#dbeafe', text: '#1e40af' },
  'Sluice Renovation':  { bg: '#ede9fe', text: '#4c1d95' },
  'Canal Work':         { bg: '#cffafe', text: '#164e63' },
}

export default function Maintenance() {
  const { user } = useApp()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [taluks, setTaluks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTaluk, setFilterTaluk] = useState(user?.scope || '')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      weApi.list({ ordering: '-start_date' }),
      geo.taluks(),
    ]).then(([we, tk]) => {
      const raw = Array.isArray(we) ? we : (we.results || [])
      setEntries(raw.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)))
      setTaluks(Array.isArray(tk) ? tk : (tk.results || []))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = entries.filter(e => {
    if (filterTaluk && e.taluk_name !== filterTaluk) return false
    if (filterType && e.work_type !== filterType) return false
    if (filterStatus === 'Overdue') { if (!isOverdue(e)) return false }
    else if (filterStatus && e.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!e.water_body_name?.toLowerCase().includes(q) &&
          !e.water_body_wb_id?.toLowerCase().includes(q) &&
          !e.taluk_name?.toLowerCase().includes(q) &&
          !e.officer?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalCount     = entries.length
  const overdueCount   = entries.filter(isOverdue).length
  const inProgCount    = entries.filter(e => e.status === 'In Progress').length
  const completedCount = entries.filter(e => e.status === 'Completed').length
  const recentWorks    = [...entries].slice(0, 6)

  function exportCSV() {
    const rows = [['WB ID','Water Body','Taluk','Work Type','Title','Officer','Visit Date','Status']]
    filtered.forEach(e => rows.push([
      e.water_body_wb_id, e.water_body_name, e.taluk_name,
      e.work_type, e.title, e.officer, e.start_date, e.status,
    ]))
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `maintenance_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-end gap-3">

        {user?.canExport && (
          <button className="btn-secondary" onClick={exportCSV}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Works', value: totalCount,     color: '#0891b2', bg: '#cff4f8' },
          { label: 'Overdue',     value: overdueCount,   color: '#dc2626', bg: '#fde0e0' },
          { label: 'In Progress', value: inProgCount,    color: '#1d4ed8', bg: '#dbe7fe' },
          { label: 'Completed',   value: completedCount, color: '#15803d', bg: '#d8f3e2' },
        ].map(k => (
          <div key={k.label} className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-lg" style={{ background: k.bg, color: k.color }}>{k.value}</div>
            <div className="text-sm font-medium text-gray-600">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Main table — full width */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search water body, officer, taluk…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input flex-1 min-w-40"
              />
              <select className="input w-auto" value={filterTaluk} onChange={e => setFilterTaluk(e.target.value)}>
                <option value="">All Taluks</option>
                {taluks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <select className="input w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">All Types</option>
                {['Inspection','Desilting','Bund strengthening','Sluice Renovation','Canal Work','Other'].map(t =>
                  <option key={t}>{t}</option>
                )}
              </select>
              <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="Overdue">Overdue</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-10 text-gray-400">Loading…</div>
              ) : (
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-head px-4 py-3 text-left">Water Body</th>
                      <th className="table-head px-4 py-3 text-left">Taluk</th>
                      <th className="table-head px-4 py-3 text-left">Work Type</th>
                      <th className="table-head px-4 py-3 text-left">Visit Date</th>
                      <th className="table-head px-4 py-3 text-left">Officer</th>
                      <th className="table-head px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400">No records match.</td></tr>
                    )}
                    {filtered.map(e => {
                      const overdue = isOverdue(e)
                      const tc = WORK_TYPE_COLORS[e.work_type] || { bg: '#f3f4f6', text: '#374151' }
                      return (
                        <tr
                          key={e.id}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/water-bodies/${e.water_body}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{e.water_body_name || '—'}</div>
                            {e.water_body_survey_number && (
                              <div className="text-xs text-gray-500 mt-0.5">Survey: {e.water_body_survey_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{e.taluk_name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.text }}>
                              {e.work_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`font-medium ${overdue ? 'text-red-600' : 'text-gray-700'}`}>{fmt(e.start_date)}</div>
                            {overdue && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full mt-0.5">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0Z" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>
                                OVERDUE
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{e.officer || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={e.status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-50 text-xs text-gray-400">
                Showing {filtered.length} of {entries.length} work entries
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity — horizontal strip below the table */}
        <div className="card p-4">
          <h2 className="font-heading font-semibold text-gray-800 mb-3">Recent Work Activity</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentWorks.map(item => (
              <div
                key={item.id}
                className="flex flex-col gap-1 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/water-bodies/${item.water_body}`)}
              >
                <div className="font-medium text-xs text-gray-800 truncate">{item.water_body_name}</div>
                <div className="text-[10px] text-gray-400 truncate">{item.work_type}</div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <StatusBadge status={item.status} size="xs"/>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{fmt(item.start_date)}</div>
              </div>
            ))}
            {recentWorks.length === 0 && !loading && (
              <div className="col-span-full text-sm text-gray-400 text-center py-2">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
