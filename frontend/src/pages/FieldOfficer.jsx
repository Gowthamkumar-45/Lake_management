import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { waterBodies as wbApi, workEntries as weApi, photos as photosApi, waterLevelHistory as levelApi, assignments as assignmentsApi } from '../services/api.js'

// ── Tamil / English strings ───────────────────────────────────────────────────
const STRINGS = {
  en: {
    title: 'Field Officer Portal', subtitle: 'Submit GPS-tagged field updates',
    step1: 'Select Water Body', step2: 'Work Details', step3: 'Water Status',
    step4: 'Issues Observed', step5: 'Site Photos',
    selectBody: 'Select water body', searchPlaceholder: 'Search water body…',
    workType: 'Work Type', visitDate: 'Visit Date', completionDate: 'Completion Date (optional)',
    workNotes: 'Work Notes', notesPlaceholder: 'Describe work done, observations…',
    customWork: 'Specify work type (e.g. Fence repair…)',
    waterLevel: 'Water Level Status', estimatedLevel: 'Estimated Water Level',
    issues: 'Issues Observed', recommendation: 'Recommendation',
    recPlaceholder: 'Any recommendation for follow-up…',
    photos: 'Site Photos', camera: 'Camera', gallery: 'Gallery',
    submit: 'Submit Report', submitting: 'Submitting…', reset: 'New Report',
    gpsCapture: 'Capture GPS', gpsCapturing: 'Acquiring GPS…',
    offlineQueue: 'Offline — will submit when connected',
    assignedOnly: 'My assigned water bodies',
    allBodies: 'All water bodies',
  },
  ta: {
    title: 'வயல் அலுவலர் தளம்', subtitle: 'GPS-குறிப்பிட்ட புல நடவடிக்கைகளை சமர்ப்பிக்கவும்',
    step1: 'நீர்நிலை தேர்வு', step2: 'பணி விவரங்கள்', step3: 'நீர் நிலை',
    step4: 'கண்டறியப்பட்ட சிக்கல்கள்', step5: 'தள புகைப்படங்கள்',
    selectBody: 'நீர்நிலை தேர்வு செய்யவும்', searchPlaceholder: 'நீர்நிலை தேடவும்…',
    workType: 'பணி வகை', visitDate: 'வருகை தேதி', completionDate: 'முடிவு தேதி (விரும்பினால்)',
    workNotes: 'பணி குறிப்புகள்', notesPlaceholder: 'செய்யப்பட்ட பணி, கவனிப்புகள்…',
    customWork: 'பணி வகையை குறிப்பிடவும்…',
    waterLevel: 'நீர் நிலை நிலை', estimatedLevel: 'மதிப்பிடப்பட்ட நீர் மட்டம்',
    issues: 'கண்டறியப்பட்ட சிக்கல்கள்', recommendation: 'பரிந்துரை',
    recPlaceholder: 'தொடர்நடவடிக்கைக்கான பரிந்துரை…',
    photos: 'தள புகைப்படங்கள்', camera: 'கேமரா', gallery: 'தொகுப்பு',
    submit: 'அறிக்கை சமர்ப்பிக்கவும்', submitting: 'சமர்ப்பிக்கிறது…', reset: 'புதிய அறிக்கை',
    gpsCapture: 'GPS பதிவு', gpsCapturing: 'GPS கண்டறிகிறது…',
    offlineQueue: 'ஆஃப்லைன் — இணைப்பு வரும்போது சமர்ப்பிக்கப்படும்',
    assignedOnly: 'என் நீர்நிலைகள்',
    allBodies: 'அனைத்து நீர்நிலைகள்',
  },
}

function uploadPhoto(file, waterBodyId, phase, officerName, workEntryId) {
  const token = localStorage.getItem('wbms_token')
  const fd = new FormData()
  fd.append('image', file)
  fd.append('water_body', waterBodyId)
  fd.append('phase', phase === 'visit' ? 'during' : phase)
  fd.append('caption', `${file.name}`)
  fd.append('officer', officerName || '')
  if (workEntryId) fd.append('work_entry', workEntryId)
  return fetch('http://localhost:8000/api/photos/', {
    method: 'POST',
    headers: { 'Authorization': `Token ${token}` },
    body: fd,
  }).then(r => r.ok ? r.json() : Promise.reject(new Error('Photo upload failed')))
}

// ── In-app camera using getUserMedia ─────────────────────────────────────────
function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      })
      .catch(() => setError('Camera access denied. Please allow camera permission.'))

    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(file)
      onClose()
    }, 'image/jpeg', 0.92)
  }, [onCapture, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onClose} className="text-white/80 text-sm font-medium px-2 py-1">Cancel</button>
        <span className="text-white font-semibold text-sm">Take Photo</span>
        <div className="w-16" />
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 px-8 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M1 1l22 22" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Capture button */}
      <div className="shrink-0 flex items-center justify-center py-8 bg-black">
        <button
          onClick={capture}
          disabled={!ready}
          className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95"
          style={{ width: 72, height: 72 }}
        >
          <div className="w-14 h-14 rounded-full bg-white" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

function PhotoUploadZone({ photos, onAdd, onRemove }) {
  const [showCamera, setShowCamera] = useState(false)

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      onAdd({ file, preview: URL.createObjectURL(file) })
    })
  }

  function handleCapture(file) {
    onAdd({ file, preview: URL.createObjectURL(file) })
  }

  return (
    <div className="space-y-3">
      {showCamera && (
        <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />
      )}

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shrink-0">
              <img src={p.preview} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => onRemove(i)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {/* Camera — opens in-app camera via getUserMedia */}
        <button type="button" onClick={() => setShowCamera(true)}
          className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent/50 transition-all cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#0e6b86" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="#0e6b86" strokeWidth="1.8"/>
            </svg>
          </div>
          <span className="text-xs font-semibold text-accent">Camera</span>
        </button>

        {/* Gallery upload */}
        <label className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#6b7280" strokeWidth="1.8"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="#6b7280" strokeWidth="1.8"/>
              <path d="M21 15l-5-5L5 21" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-500">Gallery</span>
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
        </label>
      </div>

      {photos.length > 0 && (
        <p className="text-xs text-gray-400 text-center">{photos.length} photo{photos.length !== 1 ? 's' : ''} added</p>
      )}
    </div>
  )
}

const STATUSES = ['Full', 'Medium', 'Dry']
const ISSUE_OPTIONS = [
  'Silt accumulation', 'Weed growth', 'Bund damage', 'Encroachment',
  'Inlet blockage', 'Outlet damage', 'Dry bed', 'Pollution observed',
]
const WORK_TYPE_ICONS = {
  Inspection: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={c} strokeWidth="1.8"/><path d="m20 20-3-3" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><path d="M8 11h6M11 8v6" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Desilting:  (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M8 12l4 4 4-4" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 19h14" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
  'Bund strengthening': (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="13" width="18" height="7" rx="1" stroke={c} strokeWidth="1.8"/><path d="M3 13l9-8 9 8" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  'Sluice Renovation':  (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'Canal Work': (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Other: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

const WORK_TYPES = [
  { value: 'Inspection',         label: 'Field Inspection'  },
  { value: 'Desilting',          label: 'Desilting'         },
  { value: 'Bund strengthening', label: 'Bund Strengthening'},
  { value: 'Sluice Renovation',  label: 'Sluice Renovation' },
  { value: 'Canal Work',         label: 'Canal Work'        },
  { value: 'Other',              label: 'Other Work'        },
]
const EMPTY_FORM = {
  bodyId: '', workType: 'Inspection', customWorkType: '',
  visitDate: new Date().toISOString().slice(0, 10),
  visitTime: new Date().toTimeString().slice(0, 5),
  completionDate: '', status: 'Full', level: 80,
  gpsLat: '', gpsLon: '', workNotes: '', issues: '', recommendation: '',
}

// ─── History View ─────────────────────────────────────────────────────────────
function HistoryView() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [photos, setPhotos] = useState({})

  useEffect(() => {
    weApi.list({ page_size: 200 })
      .then(d => setEntries(Array.isArray(d) ? d : (d.results || [])))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  function toggle(entry) {
    setExpanded(x => x?.id === entry.id ? null : entry)
    if (!photos[entry.water_body]) {
      photosApi.list({ water_body: entry.water_body })
        .then(d => setPhotos(p => ({ ...p, [entry.water_body]: Array.isArray(d) ? d : (d.results || []) })))
    }
  }

  const TYPE_COLORS = {
    'Desilting': '#d97706', 'Bund strengthening': '#2563eb',
    'Sluice Renovation': '#7c3aed', 'Canal Work': '#0891b2', 'Inspection': '#16a34a',
  }

  if (loading) return <div className="py-24 text-center text-gray-400 text-sm">Loading history…</div>
  if (entries.length === 0) return (
    <div className="py-24 text-center text-gray-400 space-y-3">
      <svg className="w-14 h-14 mx-auto text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="font-medium text-gray-500">No field reports yet</p>
      <p className="text-xs text-gray-400">Reports you submit will appear here</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 font-medium">{entries.length} reports found</p>
      {entries.map(entry => {
        const isOpen = expanded?.id === entry.id
        const entryPhotos = photos[entry.water_body] || []
        const lines = (entry.description || '').split('\n\n')
        const notesLine  = lines.find(l => !l.startsWith('Issues:') && !l.startsWith('Recommendation:') && !l.startsWith('GPS:'))
        const issuesLine = lines.find(l => l.startsWith('Issues:'))
        const recoLine   = lines.find(l => l.startsWith('Recommendation:'))
        const gpsLine    = lines.find(l => l.startsWith('GPS:'))
        const dot = TYPE_COLORS[entry.work_type] || '#6b7280'

        return (
          <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button onClick={() => toggle(entry)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: dot + '18' }}>
                <div className="w-3 h-3 rounded-full" style={{ background: dot }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{entry.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    {entry.officer || 'Field Officer'}
                  </span>
                  <span>·</span>
                  <span>{entry.start_date || '—'}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: dot + '18', color: dot }}>
                  {entry.work_type}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/60">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  {notesLine && (
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observation</p>
                      <p className="text-gray-700 leading-relaxed">{notesLine}</p>
                    </div>
                  )}
                  {issuesLine && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Issues</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {issuesLine.replace('Issues: ', '').split(', ').map(iss => (
                          <span key={iss} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">{iss}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {recoLine && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Recommendation</p>
                      <p className="text-gray-700">{recoLine.replace('Recommendation: ', '')}</p>
                    </div>
                  )}
                  {gpsLine && (
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">GPS</p>
                      <p className="font-mono text-xs text-gray-600">{gpsLine.replace('GPS: ', '')}</p>
                    </div>
                  )}
                </div>
                {entryPhotos.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Photos ({entryPhotos.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {entryPhotos.slice(0, 8).map(p => (
                        <a key={p.id} href={p.image} target="_blank" rel="noreferrer">
                          <img src={p.image} alt={p.caption || ''} className="w-20 h-20 rounded-xl object-cover border border-gray-200 hover:scale-105 transition-transform" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const OFFLINE_QUEUE_KEY = 'wbms_offline_queue'

function loadOfflineQueue() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]') } catch { return [] }
}
function saveOfflineQueue(q) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q))
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FieldOfficer() {
  const { user, toast } = useApp()
  const [lang, setLang]               = useState('en')
  const S = STRINGS[lang]
  const [activeTab, setActiveTab]     = useState('new')
  const [form, setForm]               = useState(EMPTY_FORM)
  const [selectedIssues, setSelectedIssues] = useState([])
  const [gpsLoading, setGpsLoading]   = useState(false)
  const [gpsFixed, setGpsFixed]       = useState(false)
  const [gpsError, setGpsError]       = useState('')
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [gpsPlace, setGpsPlace]       = useState(null)
  const [gpsManual, setGpsManual]     = useState(false)
  const [photos, setPhotos]           = useState([])
  const [submitting, setSubmitting]   = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [submitted, setSubmitted]     = useState(false)
  const [submittedBody, setSubmittedBody] = useState(null)
  const [bodies, setBodies]           = useState([])
  const [allBodies, setAllBodies]     = useState([])
  const [assignedIds, setAssignedIds] = useState(null) // null = no assignments, [] = all assigned
  const [showAssignedOnly, setShowAssignedOnly] = useState(false)
  const [loadingBodies, setLoadingBodies] = useState(true)
  const [isOnline, setIsOnline]       = useState(navigator.onLine)
  const [offlineQueueCount, setOfflineQueueCount] = useState(loadOfflineQueue().length)

  useEffect(() => {
    function onOnline() {
      setIsOnline(true)
      flushOfflineQueue()
    }
    function onOffline() { setIsOnline(false) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [user])

  async function flushOfflineQueue() {
    const q = loadOfflineQueue()
    if (!q.length) return
    let flushed = 0
    const remaining = []
    for (const item of q) {
      try {
        await weApi.create(item.workEntry)
        if (item.levelEntry) await levelApi.create(item.levelEntry).catch(() => {})
        if (item.wbPatch) await wbApi.update(item.wbPatch.id, item.wbPatch.data).catch(() => {})
        flushed++
      } catch { remaining.push(item) }
    }
    saveOfflineQueue(remaining)
    setOfflineQueueCount(remaining.length)
    if (flushed > 0) toast(`${flushed} offline report${flushed > 1 ? 's' : ''} submitted`, 'success')
  }

  useEffect(() => {
    const params = { page_size: 500 }
    if (user?.scope) params.taluk = user.scope
    wbApi.list(params)
      .then(d => {
        const list = Array.isArray(d) ? d : (d.results || [])
        setAllBodies(list)
        setBodies(list)
        if (list.length > 0) setForm(f => ({ ...f, bodyId: String(list[0].id) }))
      }).catch(() => {}).finally(() => setLoadingBodies(false))
  }, [user?.scope])

  // Fetch assignments for field officer
  useEffect(() => {
    if (!user?.id) return
    assignmentsApi.list({ active: 'true' })
      .then(d => {
        const list = Array.isArray(d) ? d : (d.results || [])
        if (list.length > 0) {
          setAssignedIds(list.map(a => a.water_body))
        }
      }).catch(() => {})
  }, [user?.id])

  // Apply assigned filter
  useEffect(() => {
    if (showAssignedOnly && assignedIds && assignedIds.length > 0) {
      const filtered = allBodies.filter(b => assignedIds.includes(b.id))
      setBodies(filtered.length > 0 ? filtered : allBodies)
    } else {
      setBodies(allBodies)
    }
  }, [showAssignedOnly, assignedIds, allBodies])

  const selectedBody = bodies.find(b => String(b.id) === String(form.bodyId))
  const isInspection = form.workType === 'Inspection'

  function toggleIssue(issue) {
    setSelectedIssues(prev => prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue])
  }

  async function reverseGeocode(lat, lon) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
        { headers: { 'User-Agent': 'WBMS-App/1.0' } }
      )
      const data = await res.json()
      const a = data.address || {}
      setGpsPlace({
        village:  a.village || a.hamlet || a.suburb || a.neighbourhood || '',
        taluk:    a.county || a.state_district || '',
        district: a.state_district || a.county || '',
        state:    a.state || '',
        display:  data.display_name || '',
      })
    } catch { setGpsPlace(null) }
  }

  function captureGPS() {
    setGpsLoading(true)
    setGpsPlace(null)
    setGpsError('')
    setGpsFixed(false)
    setGpsAccuracy(null)

    if (!navigator.geolocation) {
      setGpsError('GPS is not supported on this device/browser.')
      setGpsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(6)
        const lon = pos.coords.longitude.toFixed(6)
        const acc = Math.round(pos.coords.accuracy)
        setForm(f => ({ ...f, gpsLat: lat, gpsLon: lon }))
        setGpsFixed(true)
        setGpsAccuracy(acc)
        setGpsLoading(false)
        toast('GPS location captured', 'success')
        reverseGeocode(lat, lon)
      },
      err => {
        setGpsLoading(false)
        const msgs = {
          1: 'Location permission denied. Please allow location access in browser settings.',
          2: 'Unable to determine location. Move to an open area and try again.',
          3: 'GPS timed out. Move outdoors and try again.',
        }
        setGpsError(msgs[err.code] || 'GPS failed. Try again or enter coordinates manually.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.gpsLat) { toast('Please capture GPS location first', 'error'); return }
    if (!form.bodyId) { toast('Please select a water body', 'error'); return }
    setSubmitting(true)

    const desc = [
      form.workNotes,
      selectedIssues.length ? `Issues: ${selectedIssues.join(', ')}` : '',
      form.recommendation ? `Recommendation: ${form.recommendation}` : '',
      `GPS: ${form.gpsLat}, ${form.gpsLon}`,
    ].filter(Boolean).join('\n\n')

    const workLabel = WORK_TYPES.find(t => t.value === form.workType)?.label || form.workType
    const workEntry = {
      water_body: Number(form.bodyId),
      work_type: form.workType === 'Other' ? (form.customWorkType.trim() || 'Other') : form.workType,
      title: `${workLabel} — ${selectedBody?.name || ''}`,
      description: desc,
      status: 'Completed',
      start_date: form.visitDate,
      completion_date: form.completionDate || form.visitDate,
      progress: 100,
      officer: user?.name || '',
    }
    const levelEntry = isInspection ? {
      water_body: Number(form.bodyId),
      level: form.level,
      status: form.status,
      recorded_by: user?.name || '',
      recorded_at: form.visitDate,
    } : null
    const wbPatch = isInspection ? {
      id: Number(form.bodyId),
      data: { status: form.status, water_level: form.level, last_inspection: form.visitDate },
    } : null

    if (!isOnline) {
      const q = loadOfflineQueue()
      q.push({ workEntry, levelEntry, wbPatch, queuedAt: new Date().toISOString() })
      saveOfflineQueue(q)
      setOfflineQueueCount(q.length)
      setSubmittedBody(selectedBody)
      setSubmitted(true)
      toast(S.offlineQueue, 'info')
      setSubmitting(false)
      return
    }

    try {
      setUploadProgress('Saving report…')
      const createdEntry = await weApi.create(workEntry)

      if (isInspection) {
        await wbApi.update(Number(form.bodyId), wbPatch.data).catch(() => {})
        await levelApi.create(levelEntry).catch(() => {})
      }

      for (let i = 0; i < photos.length; i++) {
        setUploadProgress(`Uploading photo ${i + 1} / ${photos.length}…`)
        await uploadPhoto(photos[i].file, Number(form.bodyId), 'visit', user?.name || '', createdEntry?.id)
      }
      setSubmittedBody(selectedBody)
      setSubmitted(true)
      toast('Field report submitted!', 'success')
    } catch (err) {
      toast(err.message || 'Submission failed', 'error')
    } finally { setSubmitting(false); setUploadProgress('') }
  }

  function resetForm() {
    photos.forEach(p => URL.revokeObjectURL(p.preview))
    setForm({ ...EMPTY_FORM, bodyId: bodies[0] ? String(bodies[0].id) : '' })
    setSelectedIssues([]); setGpsFixed(false); setGpsPlace(null); setGpsError(''); setGpsAccuracy(null)
    setPhotos([])
    setSubmitted(false); setSubmittedBody(null)
  }

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="animate-fade-in h-full flex flex-col items-center justify-center py-16 space-y-5 relative">
      <button
        onClick={resetForm}
        className="absolute top-0 right-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#16a34a" strokeWidth="1.6"/>
          <path d="M7 12l4 4 6-7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="text-center">
        <h2 className="font-heading font-bold text-2xl text-gray-800">Report Submitted!</h2>
        <p className="text-gray-500 mt-1 max-w-sm">Field update for <strong>{submittedBody?.name}</strong> has been recorded.</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 w-full max-w-md space-y-3">
        {[
          ['Water Body', submittedBody?.name],
          ['Work Type', form.workType],
          ['Visit Date', form.visitDate],
          ['GPS', `${form.gpsLat}, ${form.gpsLon}`],
          ['Photos', `${photos.length} uploaded`],
          ['Issues', selectedIssues.length ? selectedIssues.join(', ') : 'None'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm gap-4">
            <span className="text-gray-400">{k}</span>
            <span className="font-medium text-gray-800 text-right">{v}</span>
          </div>
        ))}
      </div>
      <button className="btn-primary px-8" onClick={resetForm}>{S.reset}</button>
    </div>
  )

  // ── Main Layout ─────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in h-full flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-4 mb-6 flex-wrap">

        <div className="flex items-center gap-2 flex-wrap">
          {/* Offline indicator */}
          {!isOnline && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Offline {offlineQueueCount > 0 && `· ${offlineQueueCount} queued`}
            </span>
          )}
          {/* Language toggle */}
          <button onClick={() => setLang(l => l === 'en' ? 'ta' : 'en')}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            {lang === 'en' ? 'தமிழ்' : 'EN'}
          </button>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1">
            {[['new', lang === 'en' ? 'New Report' : 'புதிய அறிக்கை'], ['history', lang === 'en' ? 'History' : 'வரலாறு']].map(([k, l]) => (
              <button key={k} onClick={() => setActiveTab(k)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === k ? 'bg-accent text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── History Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'history' && <HistoryView />}

      {/* ── New Report: Two-column layout ─────────────────────────────────── */}
      {activeTab === 'new' && (
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

          {/* LEFT COLUMN ── Form Steps */}
          <div className="flex-1 min-w-0 space-y-4 overflow-y-auto pb-4">

            {/* Step 1: Water Body + Work Type */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold shrink-0">1</div>
                <h2 className="font-heading font-semibold text-gray-800">{S.step1} &amp; {S.workType}</h2>
              </div>

              {/* Water body select */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">{S.selectBody}</label>
                  {assignedIds && assignedIds.length > 0 && (
                    <button type="button" onClick={() => setShowAssignedOnly(v => !v)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${showAssignedOnly ? 'bg-accent/10 border-accent/30 text-accent' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                      {showAssignedOnly ? S.assignedOnly : S.allBodies}
                    </button>
                  )}
                </div>
                {loadingBodies ? (
                  <div className="input text-gray-400 text-sm">Loading…</div>
                ) : (
                  <select className="input" value={form.bodyId} onChange={e => setForm(f => ({ ...f, bodyId: e.target.value }))}>
                    {bodies.map(b => <option key={b.id} value={b.id}>{b.wb_id} — {b.name}</option>)}
                  </select>
                )}
              </div>

              {/* Work type grid */}
              <div>
                <label className="label">{S.workType}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WORK_TYPES.map(wt => (
                    <button key={wt.value} type="button"
                      onClick={() => setForm(f => ({ ...f, workType: wt.value, customWorkType: '' }))}
                      className={`py-3 px-3 rounded-xl border-2 text-sm font-medium text-left transition-all flex flex-col gap-1.5 ${
                        form.workType === wt.value
                          ? 'border-accent bg-accent/5 text-accent'
                          : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                      }`}>
                      <span className="leading-none">
                        {WORK_TYPE_ICONS[wt.value]?.(form.workType === wt.value ? '#0e6b86' : '#9ca3af')}
                      </span>
                      <span className="text-xs leading-tight">{wt.label}</span>
                    </button>
                  ))}
                </div>
                {form.workType === 'Other' && (
                  <input className="input mt-2" autoFocus
                    placeholder="Specify work type (e.g. Fence repair, Inlet deepening…)"
                    value={form.customWorkType}
                    onChange={e => setForm(f => ({ ...f, customWorkType: e.target.value }))} />
                )}
              </div>

              {/* Dates */}
              {isInspection ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Visit Date</label>
                    <input type="date" className="input" value={form.visitDate}
                      onChange={e => setForm(f => ({ ...f, visitDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Visit Time</label>
                    <input type="time" className="input" value={form.visitTime}
                      onChange={e => setForm(f => ({ ...f, visitTime: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Date</label>
                    <input type="date" className="input" value={form.visitDate}
                      onChange={e => setForm(f => ({ ...f, visitDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Completion Date</label>
                    <input type="date" className="input" value={form.completionDate}
                      onChange={e => setForm(f => ({ ...f, completionDate: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: GPS */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold shrink-0">2</div>
                <h2 className="font-heading font-semibold text-gray-800">GPS Location</h2>
              </div>
              {/* Capture button */}
              <button type="button" onClick={captureGPS} disabled={gpsLoading}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  gpsFixed
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'btn-primary'
                }`}>
                {gpsLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {S.gpsCapturing}
                  </>
                ) : gpsFixed ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    {lang === 'en' ? 'Location Fixed — Tap to refresh' : 'இடம் பதிவு — புதுப்பிக்க தொடவும்'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                    {S.gpsCapture}
                  </>
                )}
              </button>

              {/* Error */}
              {gpsError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                  <div className="flex gap-2 text-red-700 text-sm">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4M12 16h.01"/></svg>
                    {gpsError}
                  </div>

                  {/* Demo / Manual options */}
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => {
                        const lat = (9.371 + (Math.random() * 0.15 - 0.075)).toFixed(6)
                        const lon = (78.834 + (Math.random() * 0.15 - 0.075)).toFixed(6)
                        setForm(f => ({ ...f, gpsLat: lat, gpsLon: lon }))
                        setGpsFixed(true); setGpsError(''); setGpsAccuracy(null)
                        reverseGeocode(lat, lon)
                        toast('Demo location used (Ramanathapuram area)', 'success')
                      }}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors">
                      📍 Use Demo Location
                    </button>
                  </div>

                  <div className="border-t border-red-100 pt-3">
                    <p className="text-xs font-semibold text-red-600 mb-2">Or enter coordinates manually:</p>
                    <div className="flex gap-2">
                      <input className="input flex-1 font-mono text-sm" placeholder="Latitude (e.g. 9.396918)"
                        value={form.gpsLat} onChange={e => setForm(f => ({ ...f, gpsLat: e.target.value }))} />
                      <input className="input flex-1 font-mono text-sm" placeholder="Longitude (e.g. 78.831368)"
                        value={form.gpsLon} onChange={e => setForm(f => ({ ...f, gpsLon: e.target.value }))} />
                      <button type="button" onClick={() => {
                        if (form.gpsLat && form.gpsLon) {
                          setGpsFixed(true); setGpsError(''); reverseGeocode(form.gpsLat, form.gpsLon)
                        }
                      }} className="btn-secondary text-sm shrink-0">Set</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Success */}
              {gpsFixed && !gpsError && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-green-700">{form.gpsLat}°N, {form.gpsLon}°E</span>
                    {gpsAccuracy && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${gpsAccuracy <= 10 ? 'bg-green-200 text-green-800' : gpsAccuracy <= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                        ±{gpsAccuracy}m {gpsAccuracy <= 10 ? '✓ High' : gpsAccuracy <= 50 ? 'Medium' : 'Low'} accuracy
                      </span>
                    )}
                  </div>
                  {gpsPlace ? (
                    <div className="flex flex-wrap gap-1.5">
                      {gpsPlace.village && <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">🏘 {gpsPlace.village}</span>}
                      {gpsPlace.taluk   && <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">📍 {gpsPlace.taluk}</span>}
                      {gpsPlace.state   && <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">🗺 {gpsPlace.state}</span>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-green-500">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Fetching location name…
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Water Status — Inspection only */}
            {isInspection && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold shrink-0">3</div>
                  <h2 className="font-heading font-semibold text-gray-800">{S.waterLevel}</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="label">{S.waterLevel}</label>
                    <div className="flex gap-2 mt-1">
                      {STATUSES.map(s => (
                        <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                            form.status === s ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 text-gray-500 hover:border-gray-200'
                          }`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">{S.estimatedLevel}</label>
                    <div className="mt-3">
                      {/* Custom slider */}
                      <div className="relative h-5 flex items-center">
                        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${form.level}%` }} />
                        </div>
                        <input type="range" min="0" max="100" value={form.level}
                          onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))}
                          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                        <div className="absolute w-5 h-5 rounded-full bg-white border-2 border-accent shadow-md pointer-events-none transition-all"
                          style={{ left: `calc(${form.level}% - ${form.level * 0.2}px)` }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>0%</span>
                        <span className="font-bold text-accent text-sm">{form.level}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Issues — Inspection only */}
            {isInspection && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold shrink-0">4</div>
                  <h2 className="font-heading font-semibold text-gray-800">{S.issues}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ISSUE_OPTIONS.map(issue => (
                    <button key={issue} type="button" onClick={() => toggleIssue(issue)}
                      className={`px-4 py-2 rounded-full text-sm border-2 font-medium transition-all ${
                        selectedIssues.includes(issue)
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}>{issue}</button>
                  ))}
                </div>
                <div>
                  <label className="label">{S.workNotes}</label>
                  <textarea className="input min-h-24 resize-y"
                    placeholder={S.notesPlaceholder}
                    value={form.workNotes} onChange={e => setForm(f => ({ ...f, workNotes: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{S.recommendation}</label>
                  <textarea className="input min-h-16 resize-y"
                    placeholder={S.recPlaceholder}
                    value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN ── Summary + Photos + Submit */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">

            {/* Water body preview card */}
            {selectedBody && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{selectedBody.wb_id}</p>
                    <h3 className="font-heading font-bold text-gray-800 leading-tight">{selectedBody.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedBody.taluk_name} · {selectedBody.village}</p>
                  </div>
                  <StatusBadge status={selectedBody.status} size="xs" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50 text-xs">
                  {[
                    ['Type', selectedBody.wb_type],
                    ['Area', selectedBody.area || '—'],
                    ['Water Level', `${selectedBody.water_level || 0}%`],
                    ['Work Status', selectedBody.work_status],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-gray-400 mb-0.5">{k}</p>
                      <p className="font-semibold text-gray-700">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold shrink-0">
                  {isInspection ? 5 : 3}
                </div>
                <h2 className="font-heading font-semibold text-gray-800">{S.photos}</h2>
              </div>
              <PhotoUploadZone photos={photos}
                onAdd={p => setPhotos(prev => [...prev, p])}
                onRemove={i => setPhotos(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i) })} />
            </div>

            {/* GPS status mini card */}
            {gpsFixed && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11Z" stroke="#16a34a" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.5" stroke="#16a34a" strokeWidth="1.8"/></svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700">GPS Fixed · ±5m accuracy</p>
                    <p className="font-mono text-[11px] text-green-600">{form.gpsLat}, {form.gpsLon}</p>
                  </div>
                </div>
                {gpsPlace ? (
                  <div className="text-xs text-green-700 leading-relaxed pl-1">
                    {[gpsPlace.village, gpsPlace.taluk, gpsPlace.state].filter(Boolean).join(', ')}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-green-500 pl-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Locating…
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="space-y-2">
              <button type="submit" disabled={submitting}
                className="btn-primary w-full justify-center py-3.5 text-base">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {uploadProgress || S.submitting}
                  </span>
                ) : !isOnline ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z"/></svg>
                    {lang === 'en' ? 'Queue for Later' : 'பின்னர் அனுப்பு'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    {S.submit}
                  </>
                )}
              </button>
              <button type="button" onClick={resetForm} disabled={submitting}
                className="btn-secondary w-full justify-center">
                {S.reset}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
