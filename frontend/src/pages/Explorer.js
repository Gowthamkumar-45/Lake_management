import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import WaterBodyMap from "../components/WaterBodyMap";
import "./Explorer.css";

const BODY_TYPES = [
  { value: "CORPORATION", label: "Corporation (Maanagaratchi)" },
  { value: "MUNICIPALITY", label: "Municipality (Nagaratchi)" },
  { value: "TOWN_PANCHAYAT", label: "Town Panchayat (Peruratchi)" },
  { value: "PANCHAYAT", label: "Panchayat (Ooratchi)" },
];

export default function Explorer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";

  // Cascade selections
  const [districts, setDistricts] = useState([]);
  const [districtId, setDistrictId] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [localBodies, setLocalBodies] = useState([]);
  const [localBodyId, setLocalBodyId] = useState("");
  const [wards, setWards] = useState([]);
  const [wardId, setWardId] = useState("");
  const [areas, setAreas] = useState([]);
  const [areaId, setAreaId] = useState("");
  const [villages, setVillages] = useState([]);
  const [villageId, setVillageId] = useState("");

  const [waterBodies, setWaterBodies] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const usesWards = bodyType && bodyType !== "PANCHAYAT";
  const selectedBody = localBodies.find((b) => String(b.id) === String(localBodyId));

  // Load districts once.
  useEffect(() => {
    client.get("/districts/").then((r) => setDistricts(r.data.results || r.data));
  }, []);

  // District + body type -> local bodies
  useEffect(() => {
    setLocalBodyId(""); setWardId(""); setAreaId(""); setVillageId("");
    setWards([]); setAreas([]); setVillages([]); setWaterBodies([]);
    if (districtId && bodyType) {
      client
        .get(`/local-bodies/?district=${districtId}&body_type=${bodyType}`)
        .then((r) => setLocalBodies(r.data.results || r.data));
    } else {
      setLocalBodies([]);
    }
  }, [districtId, bodyType]);

  // Local body -> wards (or villages)
  useEffect(() => {
    setWardId(""); setAreaId(""); setVillageId(""); setAreas([]); setWaterBodies([]);
    if (!localBodyId) { setWards([]); setVillages([]); return; }
    if (usesWards) {
      client.get(`/wards/?local_body=${localBodyId}`).then((r) => setWards(r.data.results || r.data));
    } else {
      client.get(`/villages/?local_body=${localBodyId}`).then((r) => setVillages(r.data.results || r.data));
    }
  }, [localBodyId, usesWards]);

  // Ward -> areas
  useEffect(() => {
    setAreaId("");
    if (wardId) {
      client.get(`/areas/?ward=${wardId}`).then((r) => setAreas(r.data.results || r.data));
    } else {
      setAreas([]);
    }
  }, [wardId]);

  // Load water bodies for the deepest selected level.
  const loadWaterBodies = useCallback(() => {
    const params = new URLSearchParams();
    if (areaId) params.set("area", areaId);
    else if (villageId) params.set("village", villageId);
    else if (wardId) params.set("ward", wardId);
    else if (localBodyId) params.set("local_body", localBodyId);
    else return setWaterBodies([]);
    if (statusFilter) params.set("status", statusFilter);

    setLoading(true);
    client.get(`/water-bodies/?${params.toString()}`).then((r) => {
      setWaterBodies(r.data.results || r.data);
      setLoading(false);
    });
  }, [areaId, villageId, wardId, localBodyId, statusFilter]);

  useEffect(() => { loadWaterBodies(); }, [loadWaterBodies]);

  const mapCenter = selectedBody?.latitude
    ? [Number(selectedBody.latitude), Number(selectedBody.longitude)]
    : undefined;

  const markers = waterBodies.map((w) => ({ ...w, selected: w.id === selectedId }));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Explore Lakes &amp; Ponds</h1>
          <p className="muted">
            Drill down through district → local body → ward/village → area to find water bodies.
          </p>
        </div>
      </div>

      <div className="card cascade-card">
        <div className="cascade-grid">
          <div className="field">
            <label>District</label>
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              <option value="">Select district…</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Local Body Type</label>
            <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} disabled={!districtId}>
              <option value="">Select type…</option>
              {BODY_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Local Body</label>
            <select value={localBodyId} onChange={(e) => setLocalBodyId(e.target.value)} disabled={!bodyType}>
              <option value="">Select…</option>
              {localBodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {usesWards ? (
            <>
              <div className="field">
                <label>Ward</label>
                <select value={wardId} onChange={(e) => setWardId(e.target.value)} disabled={!localBodyId}>
                  <option value="">Select ward…</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.number ? `Ward ${w.number} — ${w.name}` : w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Area</label>
                <select value={areaId} onChange={(e) => setAreaId(e.target.value)} disabled={!wardId}>
                  <option value="">Select area…</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </>
          ) : bodyType === "PANCHAYAT" ? (
            <div className="field">
              <label>Village</label>
              <select value={villageId} onChange={(e) => setVillageId(e.target.value)} disabled={!localBodyId}>
                <option value="">Select village…</option>
                {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          ) : null}
        </div>
        {statusFilter && (
          <div className="muted" style={{ fontSize: "0.82rem" }}>
            Filtering by status: <StatusBadge value={statusFilter} />{" "}
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/explorer")}>Clear</button>
          </div>
        )}
      </div>

      <div className="explorer-split">
        <div className="card">
          <div className="card-title">
            {loading ? "Loading…" : `Water Bodies (${waterBodies.length})`}
          </div>
          {waterBodies.length === 0 ? (
            <div className="empty">
              {localBodyId ? "No lakes or ponds found at this level." : "Select a location to list water bodies."}
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {waterBodies.map((w) => (
                  <tr
                    key={w.id}
                    onMouseEnter={() => setSelectedId(w.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>{w.kind_display}</td>
                    <td><StatusBadge value={w.status} label={w.status_display} /></td>
                    <td>
                      <button className="btn btn-accent btn-sm" onClick={() => navigate(`/water-bodies/${w.id}`)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card map-panel">
          <div className="card-title">Location Map</div>
          <div className="map-box">
            <WaterBodyMap
              markers={markers}
              center={mapCenter}
              onMarkerClick={(id) => navigate(`/water-bodies/${id}`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
