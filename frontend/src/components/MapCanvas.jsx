import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_COLOR = { Full: '#0891b2', Medium: '#d97706', Dry: '#dc2626' }
const STATUS_FILL  = { Full: '#cff4f8', Medium: '#fdeecb', Dry: '#fde0e0' }

// Approximate lat/lon for water bodies that have no GPS — jitter around taluk centroid
const TALUK_COORDS = {
  'Ramanathapuram':    { lat: 9.371,  lon: 78.834 },
  'Paramakudi':        { lat: 9.519,  lon: 78.589 },
  'Tiruvadanai':       { lat: 9.367,  lon: 79.053 },
  'Kamuthi':           { lat: 9.369,  lon: 78.767 },
  'Mudukulathur':      { lat: 9.341,  lon: 78.512 },
  'Rajasingamangalam': { lat: 9.455,  lon: 78.708 },
  'Kadaladi':          { lat: 9.268,  lon: 78.778 },
  'Mandapam':          { lat: 9.270,  lon: 79.130 },
}

function bodyLatLon(body) {
  // Use real GPS if stored on body
  if (body.latitude && body.longitude) return [Number(body.latitude), Number(body.longitude)]
  // Otherwise jitter deterministically around taluk centroid
  const centre = TALUK_COORDS[body.taluk_name] || TALUK_COORDS['Ramanathapuram']
  const seed = body.id || 1
  const dlat = (((seed * 137) % 100) - 50) / 1000   // ±0.05°
  const dlon = (((seed * 97)  % 100) - 50) / 1000
  return [centre.lat + dlat, centre.lon + dlon]
}

function makeMarker(body) {
  const color = STATUS_COLOR[body.status] || '#94a3b8'
  const icon = L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `
      <div class="wbms-dot-wrap">
        <span class="wbms-dot-ring" style="background:${color};opacity:0.45"></span>
        <span class="wbms-dot-core" style="background:${color}"></span>
      </div>`,
  })
  return L.marker(bodyLatLon(body), { icon })
}

export default function MapCanvas({ bodies = [], selectedTaluk = null, onSelectBody = null }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])
  const selectedRef  = useRef(null)

  // Inject pulse CSS once
  useEffect(() => {
    const id = 'wbms-pulse-style'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = `
        @keyframes wbmsPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(2.6); opacity: 0; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .wbms-dot-wrap { position: relative; width: 22px; height: 22px; }
        .wbms-dot-ring {
          position: absolute; inset: 0; border-radius: 50%;
          animation: wbmsPulse 2s ease-out infinite;
        }
        .wbms-dot-core {
          position: absolute; inset: 4px; border-radius: 50%;
          border: 2.5px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,.35);
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Init map once
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [9.37, 78.83],
      zoom: 10,
      zoomControl: true,
      attributionControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Redraw markers whenever bodies change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    selectedRef.current = null

    bodies.forEach(body => {
      const marker = makeMarker(body).addTo(map)

      const color = STATUS_COLOR[body.status] || '#94a3b8'
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 180px">
          <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">${body.wb_id || ''}</div>
          <div style="font-size:14px;font-weight:700;color:#0c2a45;line-height:1.2">${body.name}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">${body.wb_type || ''} · ${body.taluk_name || ''}</div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span>
            <span style="font-size:12px;font-weight:600;color:${color}">${body.status}</span>
            <span style="font-size:12px;color:#94a3b8">· ${body.water_level ?? '—'}%</span>
          </div>
          <a href="/water-bodies/${body.id}"
             onclick="event.preventDefault();window.__wbNavTo('/water-bodies/${body.id}')"
             style="display:inline-block;margin-top:8px;font-size:11px;font-weight:600;color:#0e6b86;text-decoration:none">
            View Details →
          </a>
        </div>
      `, { maxWidth: 240 })

      marker.on('click', () => {
        onSelectBody?.(body)
      })

      markersRef.current.push(marker)
    })
  }, [bodies])

  // Pan/zoom when taluk filter changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (selectedTaluk && TALUK_COORDS[selectedTaluk]) {
      const c = TALUK_COORDS[selectedTaluk]
      map.setView([c.lat, c.lon], 12, { animate: true })
    } else if (!selectedTaluk) {
      map.setView([9.37, 78.83], 10, { animate: true })
    }
  }, [selectedTaluk])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 360, borderRadius: 8, overflow: 'hidden' }}
    />
  )
}
