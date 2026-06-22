import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { stats as statsApi } from '../services/api.js'

const RENO_COLORS = { 'Under Renovation':'#1d4ed8', 'Renovation Complete':'#15803d', 'Renovation Pending':'#9a6207', 'Encroachment':'#b91c1c', 'Disappeared':'#475569' }

const MONTHLY_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Reports() {
  const { user, toast } = useApp()
  const [period, setPeriod] = useState('2026')
  const [activeChart, setActiveChart] = useState('bar')
  const [data, setData] = useState(null)

  useEffect(() => {
    statsApi.get().then(setData).catch(() => {})
  }, [])

  function handleExport(type) {
    if (type === 'PDF') {
      const style = document.createElement('style')
      style.id = '__print_style'
      style.textContent = `
        @media print {
          body > * { display: none !important; }
          #__print_root { display: block !important; }
          @page { margin: 16mm; size: A4; }
        }
        #__print_root { display: none; font-family: sans-serif; color: #111; }
        #__print_root h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        #__print_root p.sub { font-size: 11px; color: #666; margin-bottom: 16px; }
        #__print_root .grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 16px; }
        #__print_root .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
        #__print_root .kpi-val { font-size: 22px; font-weight: 700; }
        #__print_root .kpi-lbl { font-size: 11px; color: #444; margin-top: 2px; }
        #__print_root table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
        #__print_root th { text-align: left; padding: 6px 8px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
        #__print_root td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
        #__print_root .section-title { font-size: 13px; font-weight: 700; margin: 14px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        #__print_root .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; }
        #__print_root .bar-track { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
        #__print_root .bar-fill { height: 100%; border-radius: 4px; }
      `
      document.head.appendChild(style)

      const root = document.createElement('div')
      root.id = '__print_root'
      const renoRows = renoData.map(({ cat, count }) => {
        const pct = total ? ((count / total) * 100).toFixed(1) : '0.0'
        const color = RENO_COLORS[cat]
        return `<div class="bar-row">
          <span style="width:160px;color:#444">${cat}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span style="width:50px;text-align:right;font-weight:600;color:${color}">${count} (${pct}%)</span>
        </div>`
      }).join('')
      const talukRows = talukStats.map(t => {
        const fullPct = t.total ? Math.round((t.full / t.total) * 100) : 0
        const dryPct = t.total ? Math.round((t.dry / t.total) * 100) : 0
        const score = Math.round(fullPct * 0.7 + (100 - dryPct) * 0.3)
        return `<tr><td>${t.name}</td><td>${t.total}</td><td>${fullPct}%</td><td>${dryPct}%</td><td><b>${score}</b></td></tr>`
      }).join('')

      root.innerHTML = `
        <h1>Reports & Analytics — Ramanathapuram District</h1>
        <p class="sub">Generated on ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })} · Year ${period}</p>
        <div class="grid4">
          <div class="kpi"><div class="kpi-val" style="color:#0891b2">${total}</div><div class="kpi-lbl">Total Water Bodies</div></div>
          <div class="kpi"><div class="kpi-val" style="color:#15803d">${fullCount}</div><div class="kpi-lbl">Currently Full</div></div>
          <div class="kpi"><div class="kpi-val" style="color:#1d4ed8">${completedWork}</div><div class="kpi-lbl">Works Completed</div></div>
          <div class="kpi"><div class="kpi-val" style="color:#dc2626">${dryCount}</div><div class="kpi-lbl">Dry / Critical</div></div>
        </div>
        <div class="section-title">Renovation Status</div>
        ${renoRows}
        <div class="section-title">Taluk Performance</div>
        <table>
          <thead><tr><th>Taluk</th><th>Total</th><th>Full%</th><th>Dry%</th><th>Score</th></tr></thead>
          <tbody>${talukRows}</tbody>
        </table>
        <div class="section-title">Work Status</div>
        <table>
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            <tr><td>Completed</td><td>${completedWork}</td></tr>
            <tr><td>In Progress</td><td>${inProgressWork}</td></tr>
            <tr><td>Pending</td><td>${pendingWork}</td></tr>
            <tr><td>Due Alerts</td><td>${data?.due_alerts || 0}</td></tr>
          </tbody>
        </table>
      `
      document.body.appendChild(root)
      window.print()
      document.body.removeChild(root)
      document.head.removeChild(style)
      return
    }
    if (type === 'Excel') {
      const rows = [
        ['Taluk', 'Total', 'Full', 'Medium', 'Dry', 'Full%', 'Dry%'],
        ...talukStats.map(t => [
          t.name, t.total, t.full, t.medium, t.dry,
          t.total ? ((t.full / t.total) * 100).toFixed(1) : 0,
          t.total ? ((t.dry / t.total) * 100).toFixed(1) : 0,
        ])
      ]
      const csv = rows.map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `wbms-report-${period}.csv`; a.click()
      URL.revokeObjectURL(url)
      toast('CSV downloaded', 'success')
      return
    }
    toast(`${type} report exported`, 'success')
  }

  const total = data?.total || 0
  const fullCount = data?.status?.full || 0
  const medCount = data?.status?.medium || 0
  const dryCount = data?.status?.dry || 0
  const completedWork = data?.completed_works || 0
  const inProgressWork = data?.active_maintenance || 0
  const pendingWork = data?.pending_works || 0

  const renoData = data ? [
    { cat: 'Under Renovation', count: data.renovation?.under || 0 },
    { cat: 'Renovation Complete', count: data.renovation?.complete || 0 },
    { cat: 'Renovation Pending', count: data.renovation?.pending || 0 },
    { cat: 'Encroachment', count: data.renovation?.encroachment || 0 },
    { cat: 'Disappeared', count: data.renovation?.disappeared || 0 },
  ] : []

  const talukStats = data?.taluk_stats || []

  const monthlyData = data?.monthly_data
    ? data.monthly_data.map(d => ({ m: MONTHLY_LABELS[d.month - 1], completions: d.completions, inspections: d.inspections }))
    : MONTHLY_LABELS.map(m => ({ m, completions: 0, inspections: 0 }))
  const talukWater = data?.taluk_water || []

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">

        <div className="flex gap-2 flex-wrap items-center">
          <select className="input w-auto" value={period} onChange={e => setPeriod(e.target.value)}>
            <option>2026</option>
            <option>2025</option>
            <option>2024</option>
          </select>
          {user?.canExport && (
            <>
              <button className="btn-secondary" onClick={() => handleExport('PDF')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
              <button className="btn-secondary" onClick={() => handleExport('Excel')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Excel
              </button>
            </>
          )}
        </div>
      </div>

      {!data ? (
        <div className="card text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Total Water Bodies', value: total.toLocaleString(), change: 'District-wide', up: true, color: '#0891b2', bg: '#cff4f8' },
              { label: 'Currently Full', value: fullCount, change: `${total ? ((fullCount/total)*100).toFixed(1) : 0}% coverage`, up: true, color: '#15803d', bg: '#d8f3e2' },
              { label: 'Works Completed', value: completedWork, change: `${inProgressWork} in progress`, up: true, color: '#1d4ed8', bg: '#dbe7fe' },
              { label: 'Dry / Critical', value: dryCount, change: `${total ? ((dryCount/total)*100).toFixed(1) : 0}% of total`, up: false, color: '#dc2626', bg: '#fde0e0' },
            ].map(k => (
              <div key={k.label} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-heading font-bold text-2xl" style={{ color: k.color }}>{k.value}</div>
                    <div className="font-medium text-sm text-gray-700 mt-0.5">{k.label}</div>
                    <div className={`text-xs mt-1 flex items-center gap-1 ${k.up ? 'text-green-600' : 'text-red-500'}`}>
                      {k.up ? '↑' : '↓'} {k.change}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
                    <div className="w-4 h-4 rounded-full" style={{ background: k.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-heading font-semibold text-gray-800">Monthly Inspection Trend — {new Date().getFullYear()}</h2>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setActiveChart('bar')} className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeChart === 'bar' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Bar</button>
                <button onClick={() => setActiveChart('line')} className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeChart === 'line' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Line</button>
              </div>
            </div>
            <div className="flex gap-4 mb-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#0e6b86'}}/>Work Completions</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#16a34a'}}/>Inspections</span>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'bar' ? (
                  <BarChart data={monthlyData} barSize={16} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="completions" name="Completions" fill="#0e6b86" radius={[3,3,0,0]} />
                    <Bar dataKey="inspections" name="Inspections" fill="#16a34a" radius={[3,3,0,0]} />
                  </BarChart>
                ) : (
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="completions" name="Completions" stroke="#0e6b86" strokeWidth={2} dot={{ fill: '#0e6b86', r: 3 }} />
                    <Line type="monotone" dataKey="inspections" name="Inspections" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 3 }} strokeDasharray="4 2" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {talukWater.length > 0 && (
            <div className="card">
              <h2 className="font-heading font-semibold text-gray-800 mb-4">Taluk-wise Average Water Level</h2>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={talukWater} barSize={32} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={v => [`${v}%`, 'Avg Water Level']} />
                    <Bar dataKey="avg_level" name="Avg Level" radius={[0,4,4,0]}
                      fill="#0891b2"
                      label={{ position: 'right', formatter: v => `${v}%`, fontSize: 11, fill: '#6b7280' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-heading font-semibold text-gray-800 mb-4">Renovation Status Summary</h2>
              <div className="space-y-3">
                {renoData.map(({ cat, count }) => {
                  const pct = total ? ((count / total) * 100).toFixed(1) : '0.0'
                  const color = RENO_COLORS[cat]
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{cat}</span>
                        <span className="font-semibold" style={{ color }}>{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card">
              <h2 className="font-heading font-semibold text-gray-800 mb-4">Taluk Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-head text-left pb-2">Taluk</th>
                      <th className="table-head text-right pb-2">Total</th>
                      <th className="table-head text-right pb-2">Full%</th>
                      <th className="table-head text-right pb-2">Dry%</th>
                      <th className="table-head text-right pb-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {talukStats.map(t => {
                      const fullPct = t.total ? Math.round((t.full / t.total) * 100) : 0
                      const dryPct = t.total ? Math.round((t.dry / t.total) * 100) : 0
                      const score = Math.round(fullPct * 0.7 + (100 - dryPct) * 0.3)
                      return (
                        <tr key={t.name} className="border-b border-gray-50">
                          <td className="py-2.5 font-medium text-gray-700">{t.name}</td>
                          <td className="py-2.5 text-right text-gray-600">{t.total}</td>
                          <td className="py-2.5 text-right"><span className="text-cyan-600 font-semibold">{fullPct}%</span></td>
                          <td className="py-2.5 text-right"><span className="text-red-500 font-semibold">{dryPct}%</span></td>
                          <td className="py-2.5 text-right">
                            <span className={`font-bold text-sm ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{score}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-3">Score = 70% full% + 30% non-dry%. Higher is better.</p>
            </div>
          </div>

          <div className="card">
            <h2 className="font-heading font-semibold text-gray-800 mb-4">Work Status Breakdown</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Completed', count: completedWork, color: '#15803d', bg: '#d8f3e2' },
                { label: 'In Progress', count: inProgressWork, color: '#1d4ed8', bg: '#dbe7fe' },
                { label: 'Pending', count: pendingWork, color: '#9a6207', bg: '#fbeecb' },
                { label: 'Due Alerts', count: data?.due_alerts || 0, color: '#b91c1c', bg: '#fde0e0' },
              ].map(w => {
                const tracked = completedWork + inProgressWork + pendingWork
                return (
                  <div key={w.label} className="rounded-xl p-4 text-center" style={{ background: w.bg }}>
                    <div className="font-heading font-bold text-3xl" style={{ color: w.color }}>{w.count}</div>
                    <div className="text-sm font-medium mt-1" style={{ color: w.color }}>{w.label}</div>
                    <div className="text-xs mt-0.5 opacity-70" style={{ color: w.color }}>
                      {tracked > 0 ? Math.round((w.count / tracked) * 100) : 0}% of tracked
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
