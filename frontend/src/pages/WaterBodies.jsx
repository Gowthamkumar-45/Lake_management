import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import LevelBar from '../components/LevelBar.jsx'
import Modal from '../components/Modal.jsx'
import { waterBodies as wbApi, geo } from '../services/api.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TYPES = ['Kanmai', 'Lake', 'Canal', 'Pond', 'River']
const STATUSES = ['Full', 'Medium', 'Dry']
const EMPTY_FORM = {
  wb_id: '', name: '', wb_type: 'Kanmai', taluk: '', village: '',
  status: 'Medium', water_level: 50, area: '', survey_number: '', work_status: 'Pending',
  latitude: '', longitude: '', address: '',
}

function LocationPicker({ lat, lon, onChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, { center: [9.371, 78.834], zoom: 10 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '© OpenStreetMap',
    }).addTo(map)

    function placeMarker(lat, lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
        markerRef.current.on('dragend', e => {
          const { lat, lng } = e.target.getLatLng()
          onChange(lat.toFixed(6), lng.toFixed(6))
        })
      }
      onChange(lat.toFixed(6), lng.toFixed(6))
    }

    map.on('click', e => placeMarker(e.latlng.lat, e.latlng.lng))
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; markerRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !lat || !lon) return
    const pos = [parseFloat(lat), parseFloat(lon)]
    if (markerRef.current) markerRef.current.setLatLng(pos)
    else {
      markerRef.current = L.marker(pos, { draggable: true }).addTo(mapRef.current)
      markerRef.current.on('dragend', e => {
        const { lat, lng } = e.target.getLatLng()
        onChange(lat.toFixed(6), lng.toFixed(6))
      })
    }
    mapRef.current.setView(pos, 14, { animate: true })
  }, [lat, lon])

  return <div ref={containerRef} style={{ width: '100%', height: 220, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2eaf2' }} />
}

function fmt(d) {
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function WaterBodies() {
  const { user, toast } = useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [bodies, setBodies] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [taluks, setTaluks] = useState([])

  const [search, setSearch] = useState('')
  const [filterTaluk, setFilterTaluk] = useState(searchParams.get('taluk') || (user?.scope || ''))
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterWork, setFilterWork] = useState(searchParams.get('work_status') || '')
  const [filterReno, setFilterReno] = useState(searchParams.get('reno') || '')
  const [page, setPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editBody, setEditBody] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const geocodeTimerRef = useRef(null)

  async function reverseGeocode(lat, lon) {
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      setForm(f => ({ ...f, address: data.display_name || '' }))
    } catch { } finally { setGeocoding(false) }
  }

  function handleAddressType(value) {
    setForm(f => ({ ...f, address: value }))
    clearTimeout(geocodeTimerRef.current)
    if (!value.trim()) return
    geocodeTimerRef.current = setTimeout(async () => {
      setGeocoding(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const [result] = await res.json()
        if (result) {
          setForm(f => ({ ...f, latitude: parseFloat(result.lat).toFixed(6), longitude: parseFloat(result.lon).toFixed(6) }))
        }
      } catch { } finally { setGeocoding(false) }
    }, 800)
  }

  useEffect(() => {
    geo.taluks().then(d => setTaluks(d.results || d)).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = { page }
    if (search) params.search = search
    if (filterTaluk) params.taluk = filterTaluk
    if (filterType) params.type = filterType
    if (filterStatus) params.status = filterStatus
    if (filterWork) params.work_status = filterWork
    if (filterReno) params.reno_status = filterReno
    wbApi.list(params)
      .then(d => { setBodies(d.results || d); setTotal(d.count || (d.results||d).length) })
      .catch(() => toast('Failed to load water bodies', 'error'))
      .finally(() => setLoading(false))
  }, [search, filterTaluk, filterType, filterStatus, filterWork, filterReno, page])

  useEffect(() => { load() }, [load])

  // Auto-open edit modal when navigated from detail page with ?edit=<id>
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || bodies.length === 0) return
    const target = bodies.find(b => String(b.id) === editId)
    if (target) { openEdit(target); setSearchParams({}, { replace: true }) }
  }, [bodies, searchParams])

  function openAdd() {
    setEditBody(null)
    setForm({ ...EMPTY_FORM, taluk: taluks[0]?.id || '' })
    setShowModal(true)
  }

  function openEdit(body) {
    setEditBody(body)
    setForm({
      name: body.name, wb_type: body.wb_type, taluk: body.taluk,
      village: body.village, status: body.status, water_level: body.water_level,
      area: body.area, survey_number: body.survey_number || '',
      work_status: body.work_status,
      latitude: body.latitude || '', longitude: body.longitude || '', address: body.address || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast('Name is required', 'error'); return }
    setSaving(true)
    try {
      if (editBody) {
        await wbApi.update(editBody.id, form)
        toast('Water body updated', 'success')
      } else {
        await wbApi.create(form)
        toast('Water body added', 'success')
      }
      setShowModal(false)
      load()
    } catch (e) {
      toast(e.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this water body?')) return
    try {
      await wbApi.delete(id)
      toast('Deleted', 'info')
      load()
    } catch { toast('Delete failed', 'error') }
  }

  function handleExport() {
    const csv = [
      ['Survey No.','Name','Type','Taluk','Village','Status','Level%','Area','Work Status'],
      ...bodies.map(b => [b.survey_number || '', b.name, b.wb_type, b.taluk_name, b.village, b.status, b.water_level, b.area, b.work_status])
    ].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'water_bodies.csv'; a.click()
    toast('CSV exported', 'success')
  }

  const talukNames = taluks.map(t => t.name)

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">

        <div className="flex gap-2 flex-wrap">
          {user?.canExport && (
            <button className="btn-secondary" onClick={handleExport}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
          )}
          <button className="btn-primary" onClick={openAdd}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Water Body
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Search by ID, name, village…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} className="input flex-1 min-w-48" />
          <select className="input w-auto" value={filterTaluk} onChange={e => { setFilterTaluk(e.target.value); setPage(1) }}>
            <option value="">All Taluks</option>
            {talukNames.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="input w-auto" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="input w-auto" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="input w-auto" value={filterWork} onChange={e => { setFilterWork(e.target.value); setPage(1) }}>
            <option value="">All Work</option>
            {['Completed','In Progress','Pending','Not Started'].map(s => <option key={s}>{s}</option>)}
          </select>
          {(search || filterTaluk || filterType || filterStatus || filterWork || filterReno) && (
            <button className="btn-secondary" onClick={() => { setSearch(''); setFilterTaluk(''); setFilterType(''); setFilterStatus(''); setFilterWork(''); setFilterReno(''); setPage(1) }}>Clear</button>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Survey No.','Name','Type','Taluk','Village','Status','Water Level','Area','Last Insp.','Next Insp.','Work Status',''].map(h => (
                    <th key={h} className="table-head px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodies.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-12 text-gray-400">No records match.</td></tr>
                )}
                {bodies.map(body => (
                  <tr key={body.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/water-bodies/${body.id}`)}>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {body.survey_number || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate whitespace-nowrap">
                      {body.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{body.wb_type}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{body.taluk_name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{body.village}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={body.status} /></td>
                    <td className="px-4 py-3 min-w-[120px]"><LevelBar level={body.water_level} status={body.status} /></td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{body.area}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmt(body.last_inspection)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmt(body.next_inspection)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={body.work_status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button className="w-7 h-7 rounded text-gray-400 hover:text-accent hover:bg-accent/10 flex items-center justify-center" onClick={() => navigate(`/water-bodies/${body.id}`)}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                        <button className="w-7 h-7 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center" onClick={() => openEdit(body)}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button className="w-7 h-7 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center" onClick={() => handleDelete(body.id)}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {total > 100 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Page {page} · {total} total</span>
            <div className="flex gap-2">
              <button className="btn-secondary py-1 px-3" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Prev</button>
              <button className="btn-secondary py-1 px-3" onClick={() => setPage(p => p+1)} disabled={bodies.length < 100}>Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editBody ? `Edit — ${editBody.wb_id}` : 'Add Water Body'} onClose={() => setShowModal(false)} size="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kadaladi Kanmai I" autoFocus />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.wb_type} onChange={e => setForm(f => ({ ...f, wb_type: e.target.value }))}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Taluk</label>
              <select className="input" value={form.taluk} onChange={e => setForm(f => ({ ...f, taluk: e.target.value }))}>
                {taluks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Survey Number</label>
              <input className="input" value={form.survey_number || ''} onChange={e => setForm(f => ({ ...f, survey_number: e.target.value }))} placeholder="e.g. 123/4A" />
            </div>
            <div>
              <label className="label">Village</label>
              <input className="input" value={form.village} onChange={e => setForm(f => ({ ...f, village: e.target.value }))} />
            </div>
            <div>
              <label className="label">Area</label>
              <input className="input" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. 48 ha" />
            </div>
            <div>
              <label className="label">Water Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Water Level (%)</label>
              <input type="number" min="0" max="100" className="input" value={form.water_level} onChange={e => setForm(f => ({ ...f, water_level: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Work Status</label>
              <select className="input" value={form.work_status} onChange={e => setForm(f => ({ ...f, work_status: e.target.value }))}>
                {['Completed','In Progress','Pending','Not Started'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="label mb-0">Location on Map</label>
                <button type="button"
                  className="text-xs font-semibold text-accent flex items-center gap-1 px-2.5 py-1 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-all"
                  onClick={() => {
                    if (!navigator.geolocation) return
                    navigator.geolocation.getCurrentPosition(pos => {
                      const lat = pos.coords.latitude.toFixed(6)
                      const lon = pos.coords.longitude.toFixed(6)
                      setForm(f => ({ ...f, latitude: lat, longitude: lon }))
                      reverseGeocode(lat, lon)
                    }, () => {})
                  }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2"/></svg>
                  Use my GPS
                </button>
              </div>
              <p className="text-xs text-gray-400">Click to place pin · Drag to fine-tune the exact location.</p>
              <LocationPicker
                lat={form.latitude}
                lon={form.longitude}
                onChange={(lat, lon) => {
                  setForm(f => ({ ...f, latitude: lat, longitude: lon }))
                  reverseGeocode(lat, lon)
                }}
              />
              {form.latitude && form.longitude && (
                <div className="flex items-center gap-2 text-xs font-mono text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {form.latitude}°N, {form.longitude}°E
                </div>
              )}
              <div>
                <label className="label">Address</label>
                <div className="relative">
                  <input
                    className="input pr-8"
                    placeholder={geocoding ? 'Fetching address…' : 'Type or auto-filled from map pin'}
                    value={form.address}
                    onChange={e => handleAddressType(e.target.value)}
                  />
                  {geocoding && (
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editBody ? 'Save Changes' : 'Add Water Body'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
