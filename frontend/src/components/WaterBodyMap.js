import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix Leaflet's default marker icons (broken under bundlers).
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
  popupAnchor: [0, -38],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Highlighted (teal) marker for the currently-selected water body.
const SelectedIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
        <path fill="#0d9488" stroke="#fff" stroke-width="2" d="M17 1C8 1 1 8 1 17c0 11 16 28 16 28s16-17 16-28C33 8 26 1 17 1z"/>
        <circle cx="17" cy="17" r="6" fill="#fff"/>
      </svg>`
    ),
  iconSize: [34, 46],
  iconAnchor: [17, 46],
  popupAnchor: [0, -40],
});

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

/**
 * Generic map showing one or more water bodies.
 * props:
 *   markers: [{ id, name, latitude, longitude, status_display, selected }]
 *   center: [lat, lng]
 *   onMarkerClick: (id) => void
 */
export default function WaterBodyMap({ markers = [], center, zoom = 13, onMarkerClick }) {
  const fallback = center || (markers[0]
    ? [Number(markers[0].latitude), Number(markers[0].longitude)]
    : [11.0168, 76.9558]);

  return (
    <MapContainer center={fallback} zoom={zoom} style={{ height: "100%", width: "100%", borderRadius: 12 }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[Number(m.latitude), Number(m.longitude)]}
          icon={m.selected ? SelectedIcon : DefaultIcon}
          eventHandlers={{ click: () => onMarkerClick && onMarkerClick(m.id) }}
        >
          <Popup>
            <strong>{m.name}</strong>
            <br />
            {m.status_display}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
