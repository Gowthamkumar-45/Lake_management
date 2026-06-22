import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { geo, waterBodies as wbApi } from '../services/api.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function LocationPicker({ lat, lon, onChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [9.371, 78.834],
      zoom: 10,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(map)

    function placeMarker(lat, lng) {
      const latStr = lat.toFixed(6)
      const lonStr = lng.toFixed(6)
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
        markerRef.current.on('dragend', e => {
          const { lat, lng } = e.target.getLatLng()
          onChange(lat.toFixed(6), lng.toFixed(6))
        })
      }
      onChange(latStr, lonStr)
    }

    map.on('click', e => placeMarker(e.latlng.lat, e.latlng.lng))

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; markerRef.current = null }
  }, [])

  // Sync marker when lat/lon props change externally (e.g. GPS)
  useEffect(() => {
    if (!mapRef.current || !lat || !lon) return
    const pos = [parseFloat(lat), parseFloat(lon)]
    if (markerRef.current) markerRef.current.setLatLng(pos)
    else markerRef.current = L.marker(pos).addTo(mapRef.current)
    mapRef.current.setView(pos, 14, { animate: true })
  }, [lat, lon])

  return (
    <div ref={containerRef} style={{ width: '100%', height: 220, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2eaf2' }} />
  )
}

function TreeItem({ label, type, children, depth = 0, icon }) {
  const [open, setOpen] = useState(depth < 2)
  return (
    <div>
      <button
        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => setOpen(o => !o)}
      >
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-90' : ''} ${!children ? 'opacity-0' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-base">{icon}</span>
        <span className={`text-sm font-medium ${depth === 0 ? 'text-gray-800' : depth === 1 ? 'text-gray-700' : 'text-gray-600'}`}>{label}</span>
        {type && <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{type}</span>}
      </button>
      {open && children && <div>{children}</div>}
    </div>
  )
}

// CSV Template columns
const CSV_HEADERS = ['name','wb_type','taluk_name','village','area','latitude','longitude','notes']
const CSV_EXAMPLE = [
  ['Ramaneri Kanmai','Kanmai','Ramanathapuram','Ramaneri','12.5 ha','9.371234','78.831234','Near NH-49'],
  ['Pamban Tank','Lake','Rameswaram','Pamban','8.2 ha','9.285000','79.210000','Coastal area'],
]

function downloadTemplate() {
  const rows = [CSV_HEADERS, ...CSV_EXAMPLE]
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'water_bodies_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function MasterData() {
  const { toast } = useApp()
  const [activeSection, setActiveSection] = useState('register')
  const [search, setSearch] = useState('')
  const [filterTaluk, setFilterTaluk] = useState('')
  const [taluks, setTaluks] = useState([])
  const [localBodies, setLocalBodies] = useState([])
  const [bodies, setBodies] = useState([])
  const [loadingBodies, setLoadingBodies] = useState(false)

  // Manual add
  const [showManual, setShowManual] = useState(false)
  const [manualForm, setManualForm] = useState({
    name: '', wb_type: 'Kanmai', taluk_name: '', village: '', area: '', latitude: '', longitude: '', notes: '',
  })
  const [manualSaving, setManualSaving] = useState(false)

  // Bulk upload
  const [showBulk, setShowBulk] = useState(false)
  const [csvRows, setCsvRows] = useState([])   // parsed preview
  const [csvFile, setCsvFile] = useState(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)  // { success, failed }
  const csvRef = useRef(null)

  useEffect(() => {
    Promise.all([geo.taluks(), geo.localBodies()])
      .then(([t, lb]) => {
        setTaluks(Array.isArray(t) ? t : (t.results || []))
        setLocalBodies(Array.isArray(lb) ? lb : (lb.results || []))
      }).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeSection !== 'register') return
    setLoadingBodies(true)
    const params = {}
    if (filterTaluk) params.taluk = filterTaluk
    if (search) params.search = search
    wbApi.list(params).then(d => setBodies(Array.isArray(d) ? d : (d.results || []))).catch(() => {}).finally(() => setLoadingBodies(false))
  }, [activeSection, filterTaluk, search])

  const talukNames = taluks.map(t => t.name)
  const lbsByTaluk = {}
  for (const lb of localBodies) {
    if (!lbsByTaluk[lb.taluk_name]) lbsByTaluk[lb.taluk_name] = []
    lbsByTaluk[lb.taluk_name].push(lb)
  }

  // ── Manual Add ──────────────────────────────────────────────────────────────
  async function handleManualAdd(e) {
    e.preventDefault()
    if (!manualForm.name || !manualForm.taluk_name) { toast('Name and Taluk are required', 'error'); return }
    setManualSaving(true)
    try {
      await wbApi.create(manualForm)
      toast(`${manualForm.name} added successfully!`, 'success')
      setShowManual(false)
      setManualForm({ name: '', wb_type: 'Kanmai', taluk_name: '', village: '', area: '', latitude: '', longitude: '', notes: '' })
      // Refresh list
      const d = await wbApi.list({})
      setBodies(Array.isArray(d) ? d : (d.results || []))
    } catch (err) {
      toast(err.message || 'Failed to add water body', 'error')
    } finally { setManualSaving(false) }
  }

  // ── CSV Parse ───────────────────────────────────────────────────────────────
  function handleCsvFile(file) {
    if (!file) return
    setCsvFile(file)
    setBulkResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { toast('CSV must have header + at least 1 data row', 'error'); return }
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/"/g, '').trim())
        const obj = {}
        headers.forEach((h, i) => { obj[h] = vals[i] || '' })
        return obj
      })
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }

  async function handleBulkUpload() {
    if (!csvRows.length) return
    setBulkUploading(true)
    setBulkResult(null)
    let success = 0, failed = 0, errors = []
    for (const row of csvRows) {
      try {
        await wbApi.create(row)
        success++
      } catch {
        failed++
        errors.push(row.name || '?')
      }
    }
    setBulkResult({ success, failed, errors })
    setBulkUploading(false)
    if (success > 0) {
      toast(`${success} water bodies added!`, 'success')
      const d = await wbApi.list({})
      setBodies(Array.isArray(d) ? d : (d.results || []))
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-end gap-3">

        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowBulk(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Bulk Upload
          </button>
          <button className="btn-primary" onClick={() => setShowManual(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Water Body
          </button>
        </div>
      </div>


      {/* ── Manual Add Modal ─────────────────────────────────────────────────── */}
      {showManual && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowManual(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <h3 className="font-heading font-bold text-lg text-gray-800">Add Water Body</h3>
              <button onClick={() => setShowManual(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <form onSubmit={handleManualAdd} className="overflow-y-auto px-6 py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Water Body Name *</label>
                  <input className="input" placeholder="e.g. Ramaneri Kanmai" autoFocus required
                    value={manualForm.name} onChange={e => setManualForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={manualForm.wb_type} onChange={e => setManualForm(f => ({...f, wb_type: e.target.value}))}>
                    {['Kanmai','Lake','Pond','Canal','River'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Taluk *</label>
                  <select className="input" required value={manualForm.taluk_name} onChange={e => setManualForm(f => ({...f, taluk_name: e.target.value}))}>
                    <option value="">Select Taluk</option>
                    {talukNames.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Village</label>
                  <input className="input" placeholder="Village name"
                    value={manualForm.village} onChange={e => setManualForm(f => ({...f, village: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Area</label>
                  <input className="input" placeholder="e.g. 12.5 ha"
                    value={manualForm.area} onChange={e => setManualForm(f => ({...f, area: e.target.value}))} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Location on Map</label>
                    <button type="button"
                      className="text-xs font-semibold text-accent flex items-center gap-1 px-2.5 py-1 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-all"
                      onClick={() => {
                        if (!navigator.geolocation) return
                        navigator.geolocation.getCurrentPosition(pos => {
                          setManualForm(f => ({
                            ...f,
                            latitude:  pos.coords.latitude.toFixed(6),
                            longitude: pos.coords.longitude.toFixed(6),
                          }))
                        }, () => {})
                      }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2"/></svg>
                      Use my GPS
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Click to place pin · Drag the pin to fine-tune the exact location.</p>
                  <LocationPicker
                    lat={manualForm.latitude}
                    lon={manualForm.longitude}
                    onChange={(lat, lon) => setManualForm(f => ({ ...f, latitude: lat, longitude: lon }))}
                  />
                  {manualForm.latitude && manualForm.longitude && (
                    <div className="flex items-center gap-2 text-xs font-mono text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {manualForm.latitude}°N, {manualForm.longitude}°E
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Notes</label>
                  <textarea className="input min-h-16 resize-y" placeholder="Additional information…"
                    value={manualForm.notes} onChange={e => setManualForm(f => ({...f, notes: e.target.value}))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowManual(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={manualSaving}>
                  {manualSaving ? 'Saving…' : 'Add Water Body'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Upload Modal ────────────────────────────────────────────────── */}
      {showBulk && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setShowBulk(false); setCsvRows([]); setCsvFile(null); setBulkResult(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-gray-800">Bulk Upload Water Bodies</h3>
              <button onClick={() => { setShowBulk(false); setCsvRows([]); setCsvFile(null); setBulkResult(null) }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Step 1: Download template */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-blue-800 text-sm">Step 1: Download Template</p>
                <p className="text-xs text-blue-600 mt-0.5">Fill the CSV template with your water body data</p>
                <p className="text-[11px] text-blue-400 mt-1 font-mono">Columns: {CSV_HEADERS.join(', ')}</p>
              </div>
              <button onClick={downloadTemplate}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Download CSV
              </button>
            </div>

            {/* Step 2: Upload file */}
            <div>
              <p className="font-semibold text-gray-700 text-sm mb-2">Step 2: Upload Filled CSV</p>
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-accent/50 hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => csvRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleCsvFile(e.dataTransfer.files[0]) }}
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                {csvFile ? (
                  <div className="text-center">
                    <p className="font-semibold text-accent text-sm">{csvFile.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{csvRows.length} rows ready to upload</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Click to select or drag & drop CSV file</p>
                    <p className="text-xs text-gray-400 mt-0.5">Only .csv files supported</p>
                  </div>
                )}
                <input ref={csvRef} type="file" accept=".csv" className="hidden"
                  onChange={e => handleCsvFile(e.target.files[0])} />
              </div>
            </div>

            {/* Preview */}
            {csvRows.length > 0 && !bulkResult && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview ({csvRows.length} rows)</p>
                <div className="border border-gray-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {['Name','Type','Taluk','Village','Area'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((row, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{row.name}</td>
                          <td className="px-3 py-2 text-gray-600">{row.wb_type}</td>
                          <td className="px-3 py-2 text-gray-600">{row.taluk_name}</td>
                          <td className="px-3 py-2 text-gray-500">{row.village}</td>
                          <td className="px-3 py-2 text-gray-500">{row.area}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Result */}
            {bulkResult && (
              <div className={`rounded-xl p-4 ${bulkResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <p className={`font-semibold text-sm ${bulkResult.failed === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  Upload Complete — {bulkResult.success} added{bulkResult.failed > 0 ? `, ${bulkResult.failed} failed` : ''}
                </p>
                {bulkResult.errors.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">Failed: {bulkResult.errors.join(', ')}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button className="btn-secondary flex-1" onClick={() => { setShowBulk(false); setCsvRows([]); setCsvFile(null); setBulkResult(null) }}>Close</button>
              {csvRows.length > 0 && !bulkResult && (
                <button onClick={handleBulkUpload} disabled={bulkUploading} className="btn-primary flex-1 justify-center">
                  {bulkUploading ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Uploading…</>
                  ) : `Upload ${csvRows.length} Records`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ── Lake Register Tab ─────────────────────────────────────────────────── */}
      {activeSection === 'register' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex flex-wrap gap-3">
              <input type="text" placeholder="Search by name, ID or village…"
                value={search} onChange={e => setSearch(e.target.value)} className="input flex-1 min-w-48" />
              <select className="input w-auto" value={filterTaluk} onChange={e => setFilterTaluk(e.target.value)}>
                <option value="">All Taluks</option>
                {talukNames.map(t => <option key={t}>{t}</option>)}
              </select>
              {(search || filterTaluk) && (
                <button className="btn-secondary" onClick={() => { setSearch(''); setFilterTaluk('') }}>Clear</button>
              )}
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Water Body Register</h2>
              <span className="text-xs text-gray-400">{bodies.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['WB ID','Name','Type','Taluk','Village','Area','Status'].map(h => (
                      <th key={h} className="table-head px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingBodies && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading…</td></tr>}
                  {!loadingBodies && bodies.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12">
                      <div className="space-y-2">
                        <p className="text-gray-400">No water bodies yet.</p>
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setShowManual(true)} className="text-accent text-xs font-semibold hover:underline">+ Add manually</button>
                          <span className="text-gray-300">or</span>
                          <button onClick={() => setShowBulk(true)} className="text-accent text-xs font-semibold hover:underline">Bulk upload CSV</button>
                        </div>
                      </div>
                    </td></tr>
                  )}
                  {bodies.map(b => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-accent">{b.wb_id}</td>
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
    </div>
  )
}
