import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { geo, waterBodies as wbApi } from '../services/api.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── action icon buttons ───────────────────────────────────────────────────────
function PlusBtn({ onClick, title }) {
  return (
    <button onClick={onClick} title={title}
      className="w-6 h-6 flex items-center justify-center rounded-full bg-accent/15 hover:bg-accent/30 text-accent shrink-0 transition-colors">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
    </button>
  )
}
function EditBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Edit"
      className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-100 text-blue-400 hover:text-blue-600 shrink-0 transition-colors">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/></svg>
    </button>
  )
}
function DelBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Delete"
      className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-300 hover:text-red-500 shrink-0 transition-colors">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    </button>
  )
}

// ── mini modal for CRUD ───────────────────────────────────────────────────────
function MiniModal({ title, fields, onSave, onClose, saving }) {
  const [vals, setVals] = useState(() => {
    const obj = {}; fields.forEach(f => { obj[f.key] = f.default || '' }); return obj
  })
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800">{title}</h4>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              {f.type === 'select'
                ? <select className="input" value={vals[f.key]} onChange={e => setVals(v => ({...v, [f.key]: e.target.value}))}>
                    {f.options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                  </select>
                : <input className="input" placeholder={f.placeholder || ''} autoFocus={f.autoFocus}
                    value={vals[f.key]} onChange={e => setVals(v => ({...v, [f.key]: e.target.value}))} />
              }
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" disabled={saving}
            onClick={() => onSave(vals)}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.replace(/"/g, '').trim())
    const obj = {}; headers.forEach((h, i) => { obj[h] = vals[i] || '' }); return obj
  })
}

// ── Hierarchy Bulk Upload Modal ───────────────────────────────────────────────
const GEO_TABS = [
  {
    key: 'taluk',
    label: 'Taluks',
    color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
    headers: ['taluk_name', 'division'],
    example: [
      ['Rameswaram', 'Ramanathapuram Division'],
      ['Kamuthi', 'Paramakudi Division'],
    ],
    note: 'division: "Ramanathapuram Division" or "Paramakudi Division"',
  },
  {
    key: 'block',
    label: 'Blocks',
    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200',
    headers: ['taluk_name', 'block_name'],
    example: [
      ['Rameswaram', 'Rameswaram Block'],
      ['Rameswaram', 'Mandapam Block'],
      ['Kamuthi', 'Kamuthi Block'],
    ],
    note: 'taluk_name must already exist. Blocks are the level directly under Taluk.',
  },
  {
    key: 'panchayat',
    label: 'Panchayats',
    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',
    headers: ['taluk_name', 'block_name', 'panchayat_name', 'type'],
    example: [
      ['Rameswaram', 'Rameswaram Block', 'Pamban Town Panchayat', 'Town Panchayat'],
      ['Rameswaram', 'Rameswaram Block', 'Mandapam Panchayat', 'Panchayat'],
      ['Kamuthi', 'Kamuthi Block', 'Abiramam Panchayat', 'Panchayat'],
    ],
    note: 'block_name must exist under that taluk. type: Municipality | Town Panchayat | Panchayat',
  },
  {
    key: 'village',
    label: 'Villages',
    color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200',
    headers: ['taluk_name', 'panchayat_name', 'village_name'],
    example: [
      ['Rameswaram', 'Pamban Town Panchayat', 'Pamban'],
      ['Rameswaram', 'Pamban Town Panchayat', 'Uchipuli South'],
      ['Kamuthi', 'Abiramam Panchayat', 'Siruthoppu'],
    ],
    note: 'panchayat_name must already exist in the system',
  },
]

function GeoBulkModal({ onClose, taluks, localBodies, onDone, toast }) {
  const [geoTab, setGeoTab] = useState('taluk')
  const [csvFile, setCsvFile] = useState(null)
  const [csvRows, setCsvRows] = useState([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)
  const cfg = GEO_TABS.find(t => t.key === geoTab)

  function switchTab(key) { setGeoTab(key); setCsvFile(null); setCsvRows([]); setResult(null) }
  function handleFile(file) {
    if (!file) return
    setCsvFile(file); setResult(null)
    const reader = new FileReader()
    reader.onload = e => setCsvRows(parseCSV(e.target.result))
    reader.readAsText(file)
  }

  async function handleUpload() {
    if (!csvRows.length) return
    setUploading(true); setResult(null)
    let success = 0, failed = 0, errors = []
    for (const row of csvRows) {
      try {
        if (geoTab === 'taluk') {
          await geo.addTaluk({ district: 1, name: row.taluk_name, division: row.division })
        } else if (geoTab === 'block') {
          const taluk = taluks.find(t => t.name.toLowerCase() === row.taluk_name.toLowerCase())
          if (!taluk) throw new Error(`Taluk "${row.taluk_name}" not found`)
          await geo.addLocalBody({ taluk: taluk.id, name: row.block_name, lb_type: 'Block', parent: null })
        } else if (geoTab === 'panchayat') {
          const taluk = taluks.find(t => t.name.toLowerCase() === row.taluk_name.toLowerCase())
          if (!taluk) throw new Error(`Taluk "${row.taluk_name}" not found`)
          const allLbs = Array.isArray(localBodies) ? localBodies : (localBodies.results || [])
          const block = allLbs.find(b => b.lb_type === 'Block' && b.name.toLowerCase() === row.block_name.toLowerCase())
          if (!block) throw new Error(`Block "${row.block_name}" not found`)
          await geo.addLocalBody({ taluk: taluk.id, name: row.panchayat_name, lb_type: row.type || 'Panchayat', parent: block.id })
        } else if (geoTab === 'village') {
          const allLbs = Array.isArray(localBodies) ? localBodies : (localBodies.results || [])
          const panchayat = allLbs.find(b => b.name.toLowerCase() === row.panchayat_name.toLowerCase())
          if (!panchayat) throw new Error(`Panchayat "${row.panchayat_name}" not found`)
          await geo.addVillage({ panchayat: panchayat.id, name: row.village_name })
        }
        success++
      } catch (err) {
        failed++
        errors.push(`${Object.values(row).join('/')} → ${err.message}`)
      }
    }
    setResult({ success, failed, errors })
    setUploading(false)
    if (success > 0) { toast(`${success} records added!`, 'success'); onDone() }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <h3 className="font-heading font-bold text-lg text-gray-800">Bulk Upload — Geographic Hierarchy</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        {/* level tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mx-6 mt-4 shrink-0">
          {GEO_TABS.map(t => (
            <button key={t.key} onClick={() => switchTab(t.key)}
              className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all ${geoTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4">
          <div className={`rounded-xl px-4 py-2.5 border text-xs ${cfg.bg} ${cfg.border} ${cfg.color}`}>
            <span className="font-semibold">Note: </span>{cfg.note}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-blue-800 text-sm">Step 1 — Download Template</p>
              <p className="text-[11px] text-blue-500 font-mono mt-1">Columns: {cfg.headers.join('  |  ')}</p>
            </div>
            <button onClick={() => downloadCSV(`${geoTab}_template.csv`, cfg.headers, cfg.example)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Download CSV
            </button>
          </div>

          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">Step 2 — Fill & Upload</p>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}>
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              {csvFile
                ? <div className="text-center"><p className="font-semibold text-accent text-sm">{csvFile.name}</p><p className="text-xs text-gray-400">{csvRows.length} rows ready</p></div>
                : <div className="text-center"><p className="text-sm font-medium text-gray-600">Click to select or drag & drop CSV</p><p className="text-xs text-gray-400 mt-0.5">Only .csv files</p></div>
              }
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>

          {csvRows.length > 0 && !result && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview ({csvRows.length} rows)</p>
              <div className="border border-gray-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>{cfg.headers.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 capitalize">{h.replace(/_/g,' ')}</th>)}</tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        {cfg.headers.map(h => <td key={h} className="px-3 py-1.5 text-gray-600">{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className={`rounded-xl p-4 ${result.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`font-semibold text-sm ${result.failed === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                Upload done — {result.success} added{result.failed > 0 ? `, ${result.failed} failed` : ''}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {result.errors.slice(0, 5).map((e, i) => <li key={i} className="text-xs text-red-600">• {e}</li>)}
                  {result.errors.length > 5 && <li className="text-xs text-gray-400">…and {result.errors.length - 5} more</li>}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-gray-100 shrink-0">
          <button className="btn-secondary flex-1" onClick={onClose}>Close</button>
          {csvRows.length > 0 && !result && (
            <button onClick={handleUpload} disabled={uploading} className="btn-primary flex-1 justify-center">
              {uploading ? 'Uploading…' : `Upload ${csvRows.length} ${cfg.label}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Water Body Bulk Upload Modal ──────────────────────────────────────────────
const WB_HEADERS = ['name', 'wb_type', 'survey_number', 'taluk_name', 'village', 'area', 'address', 'latitude', 'longitude', 'notes']
const WB_EXAMPLE = [
  ['Ramaneri Kanmai', 'Kanmai', '123/4A', 'Ramanathapuram', 'Ramaneri', '12.5 ha', 'Ramaneri Village, Ramanathapuram', '9.371234', '78.831234', 'Near NH-49'],
  ['Pamban Tank', 'Lake', '456/2B', 'Rameswaram', 'Pamban', '8.2 ha', 'Pamban, Rameswaram Taluk', '9.285000', '79.210000', 'Coastal area'],
  ['Kamuthi Pond', 'Pond', '789/3C', 'Kamuthi', 'Kamuthi', '5.0 ha', 'Kamuthi Town', '9.410000', '78.380000', ''],
]
const WB_TYPES_LIST = ['Kanmai', 'Lake', 'Pond', 'Canal', 'River']

function WbBulkModal({ onClose, talukNames, onDone, toast }) {
  const [csvFile, setCsvFile] = useState(null)
  const [csvRows, setCsvRows] = useState([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    setCsvFile(file); setResult(null)
    const reader = new FileReader()
    reader.onload = e => setCsvRows(parseCSV(e.target.result))
    reader.readAsText(file)
  }

  async function handleUpload() {
    if (!csvRows.length) return
    setUploading(true); setResult(null)
    let success = 0, failed = 0, errors = []
    for (const row of csvRows) {
      try { await wbApi.create(row); success++ }
      catch (err) { failed++; errors.push(`${row.name || '?'}: ${err.message || 'failed'}`) }
    }
    setResult({ success, failed, errors })
    setUploading(false)
    if (success > 0) { toast(`${success} water bodies added!`, 'success'); onDone() }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <h3 className="font-heading font-bold text-lg text-gray-800">Bulk Upload — Water Bodies</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { field:'name', desc:'Water body name', required:true },
              { field:'wb_type', desc:`${WB_TYPES_LIST.join(' | ')}`, required:true },
              { field:'survey_number', desc:'Revenue survey no. e.g. 123/4A' },
              { field:'taluk_name', desc:'Taluk name (must exist)', required:true },
              { field:'village', desc:'Village or locality name' },
              { field:'area', desc:'Area with unit e.g. 12.5 ha' },
              { field:'address', desc:'Full address (optional)' },
              { field:'latitude', desc:'GPS latitude e.g. 9.371234' },
              { field:'longitude', desc:'GPS longitude e.g. 78.831234' },
              { field:'notes', desc:'Additional notes (optional)' },
            ].map(({ field, desc, required }) => (
              <div key={field} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                <code className={`text-xs font-mono font-bold shrink-0 ${required ? 'text-accent' : 'text-gray-500'}`}>{field}</code>
                {required && <span className="text-[10px] text-red-400 shrink-0 mt-0.5">*</span>}
                <span className="text-xs text-gray-500">{desc}</span>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-blue-800 text-sm">Step 1 — Download Template</p>
              <p className="text-[11px] text-blue-500 font-mono mt-1">{WB_HEADERS.join('  |  ')}</p>
            </div>
            <button onClick={() => downloadCSV('water_bodies_template.csv', WB_HEADERS, WB_EXAMPLE)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Download CSV
            </button>
          </div>

          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">Step 2 — Fill & Upload</p>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}>
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              {csvFile
                ? <div className="text-center"><p className="font-semibold text-accent text-sm">{csvFile.name}</p><p className="text-xs text-gray-400">{csvRows.length} water bodies ready</p></div>
                : <div className="text-center"><p className="text-sm font-medium text-gray-600">Click to select or drag & drop CSV</p></div>
              }
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>

          {csvRows.length > 0 && !result && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview ({csvRows.length} rows)</p>
              <div className="border border-gray-100 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>{['name','wb_type','survey_number','taluk_name','village','area'].map(h =>
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 capitalize">{h.replace(/_/g,' ')}</th>)}</tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-3 py-1.5 font-medium text-gray-800">{row.name}</td>
                        <td className="px-3 py-1.5 text-gray-600">{row.wb_type}</td>
                        <td className="px-3 py-1.5 text-gray-600">{row.survey_number || '—'}</td>
                        <td className="px-3 py-1.5 text-gray-600">{row.taluk_name}</td>
                        <td className="px-3 py-1.5 text-gray-500">{row.village}</td>
                        <td className="px-3 py-1.5 text-gray-500">{row.area}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className={`rounded-xl p-4 ${result.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`font-semibold text-sm ${result.failed === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                Upload done — {result.success} added{result.failed > 0 ? `, ${result.failed} failed` : ''}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {result.errors.slice(0,5).map((e,i) => <li key={i} className="text-xs text-red-600">• {e}</li>)}
                  {result.errors.length > 5 && <li className="text-xs text-gray-400">…and {result.errors.length-5} more</li>}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-gray-100 shrink-0">
          <button className="btn-secondary flex-1" onClick={onClose}>Close</button>
          {csvRows.length > 0 && !result && (
            <button onClick={handleUpload} disabled={uploading} className="btn-primary flex-1 justify-center">
              {uploading ? 'Uploading…' : `Upload ${csvRows.length} Water Bodies`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Location Picker ───────────────────────────────────────────────────────────
function LocationPicker({ lat, lon, onChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, { center: [9.371, 78.834], zoom: 10 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:18, attribution:'© OpenStreetMap' }).addTo(map)
    function placeMarker(lat, lng) {
      if (markerRef.current) markerRef.current.setLatLng([lat, lng])
      else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
        markerRef.current.on('dragend', e => { const {lat,lng}=e.target.getLatLng(); onChange(lat.toFixed(6), lng.toFixed(6)) })
      }
      onChange(lat.toFixed(6), lng.toFixed(6))
    }
    map.on('click', e => placeMarker(e.latlng.lat, e.latlng.lng))
    mapRef.current = map
    return () => { map.remove(); mapRef.current=null; markerRef.current=null }
  }, [])
  useEffect(() => {
    if (!mapRef.current || !lat || !lon) return
    const pos = [parseFloat(lat), parseFloat(lon)]
    if (markerRef.current) markerRef.current.setLatLng(pos)
    else markerRef.current = L.marker(pos).addTo(mapRef.current)
    mapRef.current.setView(pos, 14, { animate: true })
  }, [lat, lon])
  return <div ref={containerRef} style={{ width:'100%', height:220, borderRadius:10, overflow:'hidden', border:'1px solid #e2eaf2' }} />
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MasterData() {
  const { toast } = useApp()
  const [activeTab, setActiveTab] = useState('hierarchy')
  const [hierarchy, setHierarchy] = useState(null)
  const [hierLoading, setHierLoading] = useState(true)

  const [openDivs, setOpenDivs] = useState({})
  const [openTaluks, setOpenTaluks] = useState({})
  const [openBlocks, setOpenBlocks] = useState({})
  const [openPanchayats, setOpenPanchayats] = useState({})

  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const [showGeoBulk, setShowGeoBulk] = useState(false)
  const [showWbBulk, setShowWbBulk] = useState(false)

  const [search, setSearch] = useState('')
  const [filterTaluk, setFilterTaluk] = useState('')
  const [taluks, setTaluks] = useState([])
  const [localBodies, setLocalBodies] = useState([])
  const [bodies, setBodies] = useState([])
  const [loadingBodies, setLoadingBodies] = useState(false)

  const [showManual, setShowManual] = useState(false)
  const [manualForm, setManualForm] = useState({ name:'', wb_type:'Kanmai', taluk_name:'', village:'', area:'', survey_number:'', latitude:'', longitude:'', address:'', notes:'' })
  const [manualSaving, setManualSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const geocodeTimerRef = useRef(null)

  const refreshTaluks = useCallback(() => {
    geo.taluks().then(d => setTaluks(Array.isArray(d) ? d : (d.results||[]))).catch(()=>{})
  }, [])
  const refreshLocalBodies = useCallback(() => {
    geo.localBodies().then(d => setLocalBodies(Array.isArray(d) ? d : (d.results||[]))).catch(()=>{})
  }, [])
  const loadHierarchy = useCallback(() => {
    setHierLoading(true)
    geo.hierarchy().then(d => {
      setHierarchy(d)
      const divs = {}
      d.divisions?.forEach(div => { divs[div.name] = true })
      setOpenDivs(divs)
    }).catch(()=>{}).finally(()=>setHierLoading(false))
  }, [])

  useEffect(() => { loadHierarchy() }, [loadHierarchy])
  useEffect(() => { refreshTaluks() }, [refreshTaluks])
  useEffect(() => { refreshLocalBodies() }, [refreshLocalBodies])

  useEffect(() => {
    if (activeTab !== 'register') return
    setLoadingBodies(true)
    const params = {}
    if (filterTaluk) params.taluk = filterTaluk
    if (search) params.search = search
    wbApi.list(params).then(d => setBodies(Array.isArray(d) ? d : (d.results||[]))).catch(()=>{}).finally(()=>setLoadingBodies(false))
  }, [activeTab, filterTaluk, search])

  const talukNames = taluks.map(t => t.name)

  async function reverseGeocode(lat, lon) {
    setGeocoding(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers:{'Accept-Language':'en'} })
      const data = await res.json()
      setManualForm(f => ({...f, address: data.display_name || ''}))
    } catch {} finally { setGeocoding(false) }
  }
  function handleAddressType(value) {
    setManualForm(f => ({...f, address: value}))
    clearTimeout(geocodeTimerRef.current)
    if (!value.trim()) return
    geocodeTimerRef.current = setTimeout(async () => {
      setGeocoding(true)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1`, { headers:{'Accept-Language':'en'} })
        const [r] = await res.json()
        if (r) setManualForm(f => ({...f, latitude: parseFloat(r.lat).toFixed(6), longitude: parseFloat(r.lon).toFixed(6)}))
      } catch {} finally { setGeocoding(false) }
    }, 800)
  }

  // ── hierarchy CRUD ─────────────────────────────────────────────────────────
  async function handleSave(vals) {
    setSaving(true)
    try {
      const { type, parentId, item } = modal
      const division = vals.division === '__new__' ? vals.new_division : vals.division
      if (type === 'add-taluk') await geo.addTaluk({ district:1, name:vals.name, division })
      else if (type === 'edit-taluk') await geo.updateTaluk(item.id, { name:vals.name, division })
      else if (type === 'add-block') {
        const talukId = parseInt(vals.taluk_id || parentId)
        await geo.addLocalBody({ taluk:talukId, name:vals.name, lb_type:'Block', parent:null })
      }
      else if (type === 'edit-block') await geo.updateLocalBody(item.id, { name:vals.name })
      else if (type === 'add-municipality') {
        const talukId = parseInt(vals.taluk_id)
        await geo.addLocalBody({ taluk:talukId, name:vals.name, lb_type:'Municipality', parent:null })
      }
      else if (type === 'add-town-panchayat') {
        const talukId = parseInt(vals.taluk_id)
        await geo.addLocalBody({ taluk:talukId, name:vals.name, lb_type:'Town Panchayat', parent:null })
      }
      else if (type === 'edit-localbody') await geo.updateLocalBody(item.id, { name:vals.name })
      else if (type === 'add-panchayat') await geo.addLocalBody({ taluk:item.talukId, name:vals.name, lb_type:vals.lb_type, parent:parentId })
      else if (type === 'edit-panchayat') await geo.updateLocalBody(item.id, { name:vals.name, lb_type:vals.lb_type })
      else if (type === 'add-village') await geo.addVillage({ panchayat:parentId, name:vals.name })
      else if (type === 'edit-village') await geo.updateVillage(item.id, { name:vals.name })
      toast('Saved!', 'success')
      setModal(null)
      loadHierarchy(); refreshTaluks(); refreshLocalBodies()
    } catch (err) { toast(err.message||'Save failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(type, item) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    try {
      if (type === 'taluk') await geo.deleteTaluk(item.id)
      else if (type === 'block' || type === 'panchayat') await geo.deleteLocalBody(item.id)
      else if (type === 'village') await geo.deleteVillage(item.id)
      toast(`"${item.name}" deleted`, 'success')
      loadHierarchy(); refreshTaluks(); refreshLocalBodies()
    } catch (err) { toast(err.message||'Delete failed', 'error') }
  }

  function getModalConfig() {
    if (!modal) return null
    const { type, item } = modal
    const existingDivisions = [...new Set(hierarchy?.divisions?.map(d => d.name)||[])]
    if (type === 'add-taluk' || type === 'edit-taluk') return {
      title: type === 'add-taluk' ? 'Add Taluk' : 'Edit Taluk',
      fields: [
        { key:'name', label:'Taluk Name', placeholder:'e.g. Rameswaram', autoFocus:true, default:item?.name||'' },
        { key:'division', label:'Revenue Division', type:'select', default:item?.division||(existingDivisions[0]||''),
          options:[...existingDivisions.map(d=>({value:d,label:d})),{value:'__new__',label:'+ New division'}] },
        { key:'new_division', label:'New Division Name', placeholder:'e.g. New Division', default:'' },
      ]
    }
    if (type === 'add-block' || type === 'add-municipality' || type === 'add-town-panchayat') {
      const divTaluks = modal.divisionTaluks || []
      const labels = { 'add-block':'Block Name', 'add-municipality':'Municipality Name', 'add-town-panchayat':'Town Panchayat Name' }
      const placeholders = { 'add-block':'e.g. Rameswaram Block', 'add-municipality':'e.g. Ramanathapuram Municipality', 'add-town-panchayat':'e.g. Rameswaram Town Panchayat' }
      const titles = { 'add-block':'Add Block', 'add-municipality':'Add Municipality', 'add-town-panchayat':'Add Town Panchayat' }
      return {
        title: titles[type],
        fields: [
          { key:'name', label:labels[type], placeholder:placeholders[type], autoFocus:true, default:'' },
          { key:'taluk_id', label:'Under Taluk', type:'select', default: divTaluks[0]?.id?.toString() || '',
            options: divTaluks.map(t => ({ value: t.id.toString(), label: t.name })) },
        ]
      }
    }
    if (type === 'edit-block') return {
      title: 'Edit Block',
      fields: [{ key:'name', label:'Block Name', placeholder:'e.g. Rameswaram Block', autoFocus:true, default:item?.name||'' }]
    }
    if (type === 'edit-localbody') return {
      title: `Edit ${item?.lb_type || 'Local Body'}`,
      fields: [{ key:'name', label:'Name', autoFocus:true, default:item?.name||'' }]
    }
    if (type === 'add-panchayat' || type === 'edit-panchayat') return {
      title: type === 'add-panchayat' ? 'Add Panchayat' : 'Edit Panchayat',
      fields: [
        { key:'name', label:'Panchayat Name', placeholder:'e.g. Pamban Town Panchayat', autoFocus:true, default:item?.name||'' },
        { key:'lb_type', label:'Type', type:'select', default:item?.type||'Panchayat',
          options:['Municipality','Town Panchayat','Panchayat'].map(o=>({value:o,label:o})) },
      ]
    }
    if (type === 'add-village' || type === 'edit-village') return {
      title: type === 'add-village' ? 'Add Village' : 'Edit Village',
      fields: [{ key:'name', label:'Village Name', placeholder:'e.g. Pamban', autoFocus:true, default:item?.name||'' }]
    }
    return null
  }

  async function handleManualAdd(e) {
    e.preventDefault()
    if (!manualForm.name||!manualForm.taluk_name) { toast('Name and Taluk are required','error'); return }
    setManualSaving(true)
    try {
      await wbApi.create(manualForm)
      toast(`${manualForm.name} added!`, 'success')
      setShowManual(false)
      setManualForm({ name:'', wb_type:'Kanmai', taluk_name:'', village:'', area:'', survey_number:'', latitude:'', longitude:'', address:'', notes:'' })
      if (activeTab==='register') { const d=await wbApi.list({}); setBodies(Array.isArray(d)?d:(d.results||[])) }
    } catch (err) { toast(err.message||'Failed','error') }
    finally { setManualSaving(false) }
  }

  const modalCfg = getModalConfig()

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button className="btn-secondary" onClick={() => activeTab==='hierarchy' ? setShowGeoBulk(true) : setShowWbBulk(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Bulk Upload
        </button>
        <button className="btn-primary" onClick={() => setShowManual(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Water Body
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[{key:'hierarchy',label:'Geographic Hierarchy'},{key:'register',label:'Water Body Register'}].map(tab => (
          <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab===tab.key?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Geographic Hierarchy ──────────────────────────────────────────── */}
      {activeTab === 'hierarchy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Guide */}
          <div className="card p-5">
            <h3 className="font-heading font-bold text-gray-800 mb-4">Administrative Structure</h3>
            <div className="space-y-2">
              {[
                { color:'bg-accent/10 text-accent border-accent/20', label:'District', desc:'Ramanathapuram' },
                { color:'bg-blue-50 text-blue-700 border-blue-200', label:'Revenue Division', desc:'2 divisions' },
                { color:'bg-teal-50 text-teal-700 border-teal-200', label:'Taluk', desc:'Revenue administration' },
                { color:'bg-purple-50 text-purple-700 border-purple-200', label:'Development (Block)', desc:'Panchayat Union Block' },
                { color:'bg-amber-50 text-amber-700 border-amber-200', label:'Municipality', desc:'Urban local body' },
                { color:'bg-orange-50 text-orange-700 border-orange-200', label:'Town Panchayat', desc:'Semi-urban local body' },
                { color:'bg-gray-50 text-gray-600 border-gray-200', label:'Village', desc:'Habitations' },
              ].map(({ color, label, desc }) => (
                <div key={label} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${color}`}>
                  <div><div className="font-semibold text-sm">{label}</div><div className="text-xs opacity-70">{desc}</div></div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-500">How to manage:</p>
              <div className="bg-accent/5 border border-accent/15 rounded-xl px-3 py-3 space-y-1.5">
                <p className="text-xs text-gray-600"><span className="text-accent font-bold">+</span> Hover row → green + to add child</p>
                <p className="text-xs text-gray-600"><span className="text-blue-500">✎</span> Hover row → pencil to edit name</p>
                <p className="text-xs text-gray-600"><span className="text-red-400">🗑</span> Hover row → trash to delete</p>
              </div>
              <button onClick={() => setShowGeoBulk(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-accent/40 text-accent text-xs font-semibold hover:bg-accent/5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                Bulk Upload Hierarchy
              </button>
            </div>
          </div>

          {/* Tree */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-gray-800">Hierarchy Tree</h3>
              <div className="flex gap-2">
                <button onClick={() => setModal({type:'add-taluk'})}
                  className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  Add Taluk
                </button>
                <button onClick={() => {
                  const firstDiv = hierarchy?.divisions?.[0]
                  setModal({type:'add-block', divisionTaluks: firstDiv?.taluks || taluks})
                }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  Add Block
                </button>
              </div>
            </div>

            {hierLoading && <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>}

            {!hierLoading && hierarchy && (
              <div className="space-y-1 select-none">
                {/* District */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/15 mb-3">
                  <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                  <span className="font-bold text-accent text-sm">{hierarchy.district||'Ramanathapuram'} District</span>
                </div>

                {(!hierarchy.divisions||hierarchy.divisions.length===0) && (
                  <div className="py-6 text-center text-gray-400 text-sm">No taluks yet. Click <strong className="text-accent">+ Add Taluk</strong>.</div>
                )}

                {hierarchy.divisions?.map(div => (
                  <div key={div.name} className="mb-2">
                    {/* Division row */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50/70 mb-1 cursor-pointer"
                      onClick={() => setOpenDivs(p=>({...p,[div.name]:!p[div.name]}))}>
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${openDivs[div.name]?'rotate-90':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                      <span className="font-semibold text-blue-800 text-sm flex-1">{div.name}</span>
                      <span className="text-xs text-blue-400 bg-blue-100 px-2 py-0.5 rounded-full">{div.taluks?.length}T · {div.development?.length}B · {div.municipalities?.length}M · {div.town_panchayats?.length}TP</span>
                    </div>

                    {openDivs[div.name] && (
                      <div className="ml-5 border-l-2 border-blue-100 pl-3 space-y-3 mb-2 pt-1">

                        {/* ── TALUKS ── */}
                        <SectionBlock
                          label="Taluks" color="teal"
                          onAdd={()=>setModal({type:'add-taluk',item:{division:div.name}})}
                          empty={!div.taluks?.length} emptyText="No taluks."
                        >
                          {div.taluks?.map(taluk => (
                            <div key={taluk.id}>
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors">
                                <button onClick={()=>setOpenTaluks(p=>({...p,[taluk.id]:!p[taluk.id]}))} className="flex items-center gap-2 flex-1 text-left min-w-0">
                                  <svg className="w-3.5 h-3.5 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                  <span className="font-medium text-gray-700 text-sm truncate">{taluk.name}</span>
                                  {taluk.wb_count>0 && <span className="text-xs text-accent font-semibold bg-accent/10 px-1.5 py-0.5 rounded-full shrink-0">{taluk.wb_count} WB</span>}
                                </button>
                                <div className="flex gap-1 shrink-0">
                                  <EditBtn onClick={e=>{e.stopPropagation();setModal({type:'edit-taluk',item:{id:taluk.id,name:taluk.name,division:div.name}})}} />
                                  <DelBtn onClick={e=>{e.stopPropagation();handleDelete('taluk',taluk)}} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </SectionBlock>

                        {/* ── DEVELOPMENT (Blocks → Panchayats) ── */}
                        <SectionBlock
                          label="Development" color="purple"
                          onAdd={()=>setModal({type:'add-block',divisionTaluks:div.taluks})}
                          empty={!div.development?.length} emptyText="No blocks yet."
                        >
                          {div.development?.map(block => (
                            <div key={block.id}>
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors">
                                <button onClick={()=>setOpenBlocks(p=>({...p,[block.id]:!p[block.id]}))} className="flex items-center gap-2 flex-1 text-left min-w-0">
                                  <svg className={`w-2.5 h-2.5 text-gray-300 transition-transform shrink-0 ${openBlocks[block.id]?'rotate-90':''} ${!block.panchayats?.length?'opacity-0 pointer-events-none':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                                  <svg className="w-3.5 h-3.5 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                  <span className="font-medium text-purple-800 text-sm truncate">{block.name}</span>
                                  <span className="text-[10px] text-purple-400 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full shrink-0">{block.taluk_name}</span>
                                  {block.panchayats?.length > 0 && <span className="text-[10px] text-gray-400 shrink-0">{block.panchayats.length}p</span>}
                                </button>
                                <div className="flex gap-1 shrink-0">
                                  <PlusBtn title="Add Panchayat" onClick={e=>{e.stopPropagation();setModal({type:'add-panchayat',parentId:block.id,item:{talukId:block.taluk_id}})}} />
                                  <EditBtn onClick={e=>{e.stopPropagation();setModal({type:'edit-block',item:{id:block.id,name:block.name}})}} />
                                  <DelBtn onClick={e=>{e.stopPropagation();handleDelete('block',block)}} />
                                </div>
                              </div>
                              {openBlocks[block.id] && block.panchayats?.length > 0 && (
                                <div className="ml-6 border-l-2 border-purple-100 pl-3 space-y-0.5 mt-0.5 mb-1">
                                  {block.panchayats.map(p => (
                                    <PanchayatRow key={p.id} p={p} open={openPanchayats} setOpen={setOpenPanchayats}
                                      onAddVillage={()=>setModal({type:'add-village',parentId:p.id})}
                                      onEdit={()=>setModal({type:'edit-panchayat',item:{id:p.id,name:p.name,type:p.type}})}
                                      onDelete={()=>handleDelete('panchayat',p)}
                                      onEditVillage={v=>setModal({type:'edit-village',item:{id:v.id,name:v.name}})}
                                      onDeleteVillage={v=>handleDelete('village',v)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </SectionBlock>

                        {/* ── MUNICIPALITY ── */}
                        <SectionBlock
                          label="Municipality" color="amber"
                          onAdd={()=>setModal({type:'add-municipality',divisionTaluks:div.taluks})}
                          empty={!div.municipalities?.length} emptyText="No municipalities."
                        >
                          {div.municipalities?.map(m => (
                            <LocalBodyRow key={m.id} item={m} open={openPanchayats} setOpen={setOpenPanchayats}
                              color="amber"
                              onAddVillage={()=>setModal({type:'add-village',parentId:m.id})}
                              onEdit={()=>setModal({type:'edit-localbody',item:{id:m.id,name:m.name,lb_type:m.type}})}
                              onDelete={()=>handleDelete('panchayat',m)}
                              onEditVillage={v=>setModal({type:'edit-village',item:{id:v.id,name:v.name}})}
                              onDeleteVillage={v=>handleDelete('village',v)}
                            />
                          ))}
                        </SectionBlock>

                        {/* ── TOWN PANCHAYAT ── */}
                        <SectionBlock
                          label="Town Panchayat" color="orange"
                          onAdd={()=>setModal({type:'add-town-panchayat',divisionTaluks:div.taluks})}
                          empty={!div.town_panchayats?.length} emptyText="No town panchayats."
                        >
                          {div.town_panchayats?.map(tp => (
                            <LocalBodyRow key={tp.id} item={tp} open={openPanchayats} setOpen={setOpenPanchayats}
                              color="orange"
                              onAddVillage={()=>setModal({type:'add-village',parentId:tp.id})}
                              onEdit={()=>setModal({type:'edit-localbody',item:{id:tp.id,name:tp.name,lb_type:tp.type}})}
                              onDelete={()=>handleDelete('panchayat',tp)}
                              onEditVillage={v=>setModal({type:'edit-village',item:{id:v.id,name:v.name}})}
                              onDeleteVillage={v=>handleDelete('village',v)}
                            />
                          ))}
                        </SectionBlock>

                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Water Body Register ───────────────────────────────────────────── */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap gap-3">
            <input type="text" placeholder="Search by name or village…" value={search} onChange={e=>setSearch(e.target.value)} className="input flex-1 min-w-48" />
            <select className="input w-auto" value={filterTaluk} onChange={e=>setFilterTaluk(e.target.value)}>
              <option value="">All Taluks</option>
              {talukNames.map(t=><option key={t}>{t}</option>)}
            </select>
            {(search||filterTaluk) && <button className="btn-secondary" onClick={()=>{setSearch('');setFilterTaluk('')}}>Clear</button>}
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Water Body Register</h2>
              <span className="text-xs text-gray-400">{bodies.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['Survey No.','Name','Type','Taluk','Village','Area','Status'].map(h=><th key={h} className="table-head px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loadingBodies && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading…</td></tr>}
                  {!loadingBodies && bodies.length===0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                      No records.{' '}
                      <button onClick={()=>setShowManual(true)} className="text-accent font-semibold hover:underline">+ Add one</button>
                      {' '}or{' '}
                      <button onClick={()=>setShowWbBulk(true)} className="text-accent font-semibold hover:underline">Bulk Upload</button>
                    </td></tr>
                  )}
                  {bodies.map(b=>(
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium text-sm">{b.survey_number||'—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{b.name}</td>
                      <td className="px-4 py-3 text-gray-600">{b.wb_type}</td>
                      <td className="px-4 py-3 text-gray-600">{b.taluk_name}</td>
                      <td className="px-4 py-3 text-gray-500">{b.village}</td>
                      <td className="px-4 py-3 text-gray-500">{b.area}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} size="xs" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* modals */}
      {modal && modalCfg && <MiniModal title={modalCfg.title} fields={modalCfg.fields} saving={saving} onSave={handleSave} onClose={()=>setModal(null)} />}

      {showGeoBulk && <GeoBulkModal onClose={()=>setShowGeoBulk(false)} taluks={taluks} localBodies={localBodies} toast={toast} onDone={()=>{loadHierarchy();refreshTaluks();refreshLocalBodies()}} />}

      {showWbBulk && <WbBulkModal onClose={()=>setShowWbBulk(false)} talukNames={talukNames} toast={toast} onDone={async()=>{const d=await wbApi.list({});setBodies(Array.isArray(d)?d:(d.results||[]))}} />}

      {/* Add Water Body Modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={()=>setShowManual(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <h3 className="font-heading font-bold text-lg text-gray-800">Add Water Body</h3>
              <button onClick={()=>setShowManual(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <form onSubmit={handleManualAdd} className="overflow-y-auto px-6 py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Water Body Name *</label>
                  <input className="input" placeholder="e.g. Ramaneri Kanmai" autoFocus required value={manualForm.name} onChange={e=>setManualForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={manualForm.wb_type} onChange={e=>setManualForm(f=>({...f,wb_type:e.target.value}))}>
                    {WB_TYPES_LIST.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Taluk *</label>
                  <select className="input" required value={manualForm.taluk_name} onChange={e=>setManualForm(f=>({...f,taluk_name:e.target.value}))}>
                    <option value="">Select Taluk</option>
                    {talukNames.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Village</label>
                  <input className="input" placeholder="Village name" value={manualForm.village} onChange={e=>setManualForm(f=>({...f,village:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Area</label>
                  <input className="input" placeholder="e.g. 12.5 ha" value={manualForm.area} onChange={e=>setManualForm(f=>({...f,area:e.target.value}))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Survey Number</label>
                  <input className="input" placeholder="e.g. 123/4A" value={manualForm.survey_number} onChange={e=>setManualForm(f=>({...f,survey_number:e.target.value}))} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Location on Map</label>
                    <button type="button" className="text-xs font-semibold text-accent flex items-center gap-1 px-2.5 py-1 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-all"
                      onClick={()=>{navigator.geolocation?.getCurrentPosition(pos=>{const lat=pos.coords.latitude.toFixed(6);const lon=pos.coords.longitude.toFixed(6);setManualForm(f=>({...f,latitude:lat,longitude:lon}));reverseGeocode(lat,lon)})}}>
                      Use my GPS
                    </button>
                  </div>
                  <LocationPicker lat={manualForm.latitude} lon={manualForm.longitude} onChange={(lat,lon)=>{setManualForm(f=>({...f,latitude:lat,longitude:lon}));reverseGeocode(lat,lon)}} />
                  {manualForm.latitude && manualForm.longitude && (
                    <div className="text-xs font-mono text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">{manualForm.latitude}°N, {manualForm.longitude}°E</div>
                  )}
                  <div>
                    <label className="label">Address</label>
                    <div className="relative">
                      <input className="input pr-8" placeholder="Type or auto-filled from map pin" value={manualForm.address} onChange={e=>handleAddressType(e.target.value)} />
                      {geocoding && <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Notes</label>
                  <textarea className="input min-h-16 resize-y" value={manualForm.notes} onChange={e=>setManualForm(f=>({...f,notes:e.target.value}))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={()=>setShowManual(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={manualSaving}>{manualSaving?'Saving…':'Add Water Body'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Panchayat row (reusable for both block-level and standalone) ──────────────
function PanchayatRow({ p, open, setOpen, onAddVillage, onEdit, onDelete, onEditVillage, onDeleteVillage }) {
  return (
    <div>
      <div className="group flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors">
        <button onClick={()=>setOpen(prev=>({...prev,[p.id]:!prev[p.id]}))} className="flex items-center gap-2 flex-1 text-left min-w-0">
          <svg className={`w-2.5 h-2.5 text-gray-300 transition-transform shrink-0 ${open[p.id]?'rotate-90':''} ${p.villages?.length===0?'opacity-0 pointer-events-none':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <svg className="w-3.5 h-3.5 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <span className="text-sm text-gray-600 truncate">{p.name}</span>
          <span className="ml-1 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">{p.type}</span>
          {p.villages?.length>0 && <span className="text-[10px] text-gray-400 shrink-0">{p.villages.length}v</span>}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <PlusBtn title="Add Village" onClick={e=>{e.stopPropagation();onAddVillage()}} />
          <EditBtn onClick={e=>{e.stopPropagation();onEdit()}} />
          <DelBtn onClick={e=>{e.stopPropagation();onDelete()}} />
        </div>
      </div>
      {open[p.id] && p.villages?.length>0 && (
        <div className="ml-6 border-l-2 border-orange-100 pl-3 mt-0.5 mb-1 space-y-0.5">
          {p.villages.map(v=>(
            <div key={v.id} className="group flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"/>
              <span className="text-xs text-gray-500 flex-1">{v.name}</span>
              <div className="flex gap-1 shrink-0">
                <EditBtn onClick={e=>{e.stopPropagation();onEditVillage(v)}} />
                <DelBtn onClick={e=>{e.stopPropagation();onDeleteVillage(v)}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section block wrapper (Taluks / Development / Municipality / Town Panchayat) ──
const SECTION_COLORS = {
  teal:   { badge:'text-teal-700 bg-teal-50 border-teal-200', add:'text-teal-600 hover:text-teal-800' },
  purple: { badge:'text-purple-700 bg-purple-50 border-purple-200', add:'text-purple-600 hover:text-purple-800' },
  amber:  { badge:'text-amber-700 bg-amber-50 border-amber-200', add:'text-amber-600 hover:text-amber-800' },
  orange: { badge:'text-orange-700 bg-orange-50 border-orange-200', add:'text-orange-600 hover:text-orange-800' },
}
function SectionBlock({ label, color, onAdd, empty, emptyText, children }) {
  const c = SECTION_COLORS[color] || SECTION_COLORS.teal
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${c.badge}`}>{label}</span>
        <button onClick={onAdd} className={`text-[10px] font-semibold hover:underline ${c.add}`}>+ Add</button>
      </div>
      <div className="space-y-0.5">
        {empty
          ? <div className="px-3 py-1 text-xs text-gray-400 italic">{emptyText}</div>
          : children
        }
      </div>
    </div>
  )
}

// ── Single LocalBody row (Municipality / Town Panchayat) ─────────────────────
function LocalBodyRow({ item, open, setOpen, color, onAddVillage, onEdit, onDelete, onEditVillage, onDeleteVillage }) {
  const colors = {
    amber:  { hover:'hover:bg-amber-50', icon:'text-amber-500', border:'border-amber-100' },
    orange: { hover:'hover:bg-orange-50', icon:'text-orange-500', border:'border-orange-100' },
  }
  const c = colors[color] || colors.orange
  return (
    <div>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.hover} transition-colors`}>
        <button onClick={()=>setOpen(p=>({...p,[item.id]:!p[item.id]}))} className="flex items-center gap-2 flex-1 text-left min-w-0">
          <svg className={`w-2.5 h-2.5 text-gray-300 transition-transform shrink-0 ${open[item.id]?'rotate-90':''} ${!item.villages?.length?'opacity-0 pointer-events-none':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <svg className={`w-3.5 h-3.5 shrink-0 ${c.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <span className="font-medium text-gray-700 text-sm truncate">{item.name}</span>
          <span className="text-[10px] text-gray-400 shrink-0">{item.taluk_name}</span>
          {item.villages?.length > 0 && <span className="text-[10px] text-gray-400 shrink-0">{item.villages.length}v</span>}
        </button>
        <div className="flex gap-1 shrink-0">
          <PlusBtn title="Add Village" onClick={e=>{e.stopPropagation();onAddVillage()}} />
          <EditBtn onClick={e=>{e.stopPropagation();onEdit()}} />
          <DelBtn onClick={e=>{e.stopPropagation();onDelete()}} />
        </div>
      </div>
      {open[item.id] && item.villages?.length > 0 && (
        <div className={`ml-6 border-l-2 ${c.border} pl-3 mt-0.5 mb-1 space-y-0.5`}>
          {item.villages.map(v => (
            <div key={v.id} className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-gray-50">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"/>
              <span className="text-xs text-gray-500 flex-1">{v.name}</span>
              <div className="flex gap-1 shrink-0">
                <EditBtn onClick={e=>{e.stopPropagation();onEditVillage(v)}} />
                <DelBtn onClick={e=>{e.stopPropagation();onDeleteVillage(v)}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
