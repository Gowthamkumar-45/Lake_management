import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import WaterBodyMap from "../components/WaterBodyMap";
import StatusBadge from "../components/StatusBadge";

export default function MapView() {
  const navigate = useNavigate();
  const [bodies, setBodies] = useState([]);
  const [localBodies, setLocalBodies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [districtId, setDistrictId] = useState("");
  const [localBodyId, setLocalBodyId] = useState("");

  useEffect(() => {
    client.get("/districts/").then((r) => setDistricts(r.data.results || r.data));
  }, []);

  useEffect(() => {
    if (!districtId) { setLocalBodies([]); setLocalBodyId(""); return; }
    client.get(`/local-bodies/?district=${districtId}`).then((r) => setLocalBodies(r.data.results || r.data));
  }, [districtId]);

  useEffect(() => {
    const q = localBodyId ? `?local_body=${localBodyId}` : "";
    client.get(`/water-bodies/${q}`).then((r) => setBodies(r.data.results || r.data));
  }, [localBodyId]);

  const selectedLb = localBodies.find((b) => String(b.id) === String(localBodyId));
  const center = selectedLb?.latitude ? [Number(selectedLb.latitude), Number(selectedLb.longitude)] : undefined;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Map View</h1>
          <p className="muted">All lakes &amp; ponds plotted on the local-body map.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.2rem" }}>
        <div className="row">
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>District</label>
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              <option value="">All districts</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Local Body</label>
            <select value={localBodyId} onChange={(e) => setLocalBodyId(e.target.value)} disabled={!districtId}>
              <option value="">All local bodies</option>
              {localBodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ height: 560, borderRadius: 12, overflow: "hidden" }}>
          <WaterBodyMap
            markers={bodies}
            center={center}
            zoom={center ? 13 : 11}
            onMarkerClick={(id) => navigate(`/water-bodies/${id}`)}
          />
        </div>
        <div className="muted" style={{ marginTop: "0.8rem", fontSize: "0.82rem" }}>
          {bodies.length} water bodies shown · click a marker to open details.{" "}
          {bodies.slice(0, 6).map((b) => (
            <span key={b.id} style={{ marginRight: 8 }}>
              <StatusBadge value={b.status} label={b.name} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
