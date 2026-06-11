import { useEffect, useState, useCallback } from "react";
import client from "../api/client";

const TABS = ["Districts", "Local Bodies", "Wards & Areas", "Villages", "Lakes & Ponds"];

export default function Masters() {
  const [tab, setTab] = useState("Districts");
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Master Data</h1>
          <p className="muted">Enter the district hierarchy before exploring water bodies.</p>
        </div>
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Districts" && <Districts />}
      {tab === "Local Bodies" && <LocalBodies />}
      {tab === "Wards & Areas" && <WardsAreas />}
      {tab === "Villages" && <Villages />}
      {tab === "Lakes & Ponds" && <WaterBodies />}
    </div>
  );
}

function useList(url) {
  const [items, setItems] = useState([]);
  const reload = useCallback(() => {
    if (url) client.get(url).then((r) => setItems(r.data.results || r.data));
  }, [url]);
  useEffect(() => { reload(); }, [reload]);
  return [items, reload, setItems];
}

/* ---------- Districts ---------- */
function Districts() {
  const [items, reload] = useList("/districts/");
  const [form, setForm] = useState({ name: "", code: "", latitude: "", longitude: "" });
  const [error, setError] = useState("");

  async function add() {
    setError("");
    try {
      const payload = { ...form };
      ["latitude", "longitude"].forEach((k) => { if (!payload[k]) delete payload[k]; });
      await client.post("/districts/", payload);
      setForm({ name: "", code: "", latitude: "", longitude: "" });
      reload();
    } catch (e) { setError("Failed to add. " + JSON.stringify(e.response?.data || "")); }
  }

  return (
    <div className="card">
      <div className="card-title">Districts</div>
      <table>
        <thead><tr><th>Name</th><th>Code</th><th>Lat</th><th>Lng</th></tr></thead>
        <tbody>
          {items.map((d) => <tr key={d.id}><td>{d.name}</td><td>{d.code || "—"}</td><td>{d.latitude || "—"}</td><td>{d.longitude || "—"}</td></tr>)}
          {items.length === 0 && <tr><td colSpan="4" className="empty">No districts yet.</td></tr>}
        </tbody>
      </table>
      <div className="inline-form">
        <input placeholder="District name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
        <input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
        <button className="btn btn-accent btn-sm" onClick={add}>Add</button>
      </div>
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}

/* ---------- Local Bodies ---------- */
const BODY_TYPES = [
  { value: "CORPORATION", label: "Corporation (Maanagaratchi)" },
  { value: "MUNICIPALITY", label: "Municipality (Nagaratchi)" },
  { value: "TOWN_PANCHAYAT", label: "Town Panchayat (Peruratchi)" },
  { value: "PANCHAYAT", label: "Panchayat (Ooratchi)" },
];

function LocalBodies() {
  const [districts] = useList("/districts/");
  const [districtId, setDistrictId] = useState("");
  const [items, reload] = useList(districtId ? `/local-bodies/?district=${districtId}` : "");
  const [form, setForm] = useState({ body_type: "CORPORATION", name: "", latitude: "", longitude: "" });
  const [error, setError] = useState("");

  async function add() {
    setError("");
    try {
      const payload = { ...form, district: districtId };
      ["latitude", "longitude"].forEach((k) => { if (!payload[k]) delete payload[k]; });
      await client.post("/local-bodies/", payload);
      setForm({ body_type: "CORPORATION", name: "", latitude: "", longitude: "" });
      reload();
    } catch (e) { setError("Failed. " + JSON.stringify(e.response?.data || "")); }
  }

  return (
    <div className="card">
      <div className="card-title">Local Bodies</div>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>District</label>
        <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
          <option value="">Select district…</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      {districtId && (
        <>
          <table>
            <thead><tr><th>Name</th><th>Type</th></tr></thead>
            <tbody>
              {items.map((b) => <tr key={b.id}><td>{b.name}</td><td>{b.body_type_display}</td></tr>)}
              {items.length === 0 && <tr><td colSpan="2" className="empty">No local bodies yet.</td></tr>}
            </tbody>
          </table>
          <div className="inline-form">
            <select value={form.body_type} onChange={(e) => setForm({ ...form, body_type: e.target.value })}>
              {BODY_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            <input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            <button className="btn btn-accent btn-sm" onClick={add}>Add</button>
          </div>
          {error && <div className="error-text">{error}</div>}
        </>
      )}
    </div>
  );
}

/* ---------- Wards & Areas ---------- */
function WardsAreas() {
  const [districts] = useList("/districts/");
  const [districtId, setDistrictId] = useState("");
  const [bodies, setBodies] = useState([]);
  const [localBodyId, setLocalBodyId] = useState("");
  const [wards, reloadWards] = useList(localBodyId ? `/wards/?local_body=${localBodyId}` : "");
  const [wardId, setWardId] = useState("");
  const [areas, reloadAreas] = useList(wardId ? `/areas/?ward=${wardId}` : "");
  const [wardForm, setWardForm] = useState({ name: "", number: "" });
  const [areaName, setAreaName] = useState("");

  useEffect(() => {
    if (!districtId) { setBodies([]); return; }
    // Wards/Areas only apply to non-panchayat bodies.
    client.get(`/local-bodies/?district=${districtId}`).then((r) =>
      setBodies((r.data.results || r.data).filter((b) => b.body_type !== "PANCHAYAT"))
    );
  }, [districtId]);

  async function addWard() {
    if (!wardForm.name) return;
    await client.post("/wards/", { ...wardForm, local_body: localBodyId });
    setWardForm({ name: "", number: "" });
    reloadWards();
  }
  async function addArea() {
    if (!areaName) return;
    await client.post("/areas/", { name: areaName, ward: wardId });
    setAreaName("");
    reloadAreas();
  }

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-title">Wards</div>
        <div className="field"><label>District</label>
          <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
            <option value="">Select…</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Local Body (Corp/Muni/Town Panchayat)</label>
          <select value={localBodyId} onChange={(e) => { setLocalBodyId(e.target.value); setWardId(""); }} disabled={!districtId}>
            <option value="">Select…</option>
            {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {localBodyId && (
          <>
            <table>
              <thead><tr><th>No.</th><th>Ward</th></tr></thead>
              <tbody>
                {wards.map((w) => (
                  <tr key={w.id} onClick={() => setWardId(String(w.id))} style={{ cursor: "pointer", background: String(w.id) === wardId ? "var(--teal-50)" : "" }}>
                    <td>{w.number || "—"}</td><td>{w.name}</td>
                  </tr>
                ))}
                {wards.length === 0 && <tr><td colSpan="2" className="empty">No wards.</td></tr>}
              </tbody>
            </table>
            <div className="inline-form">
              <input placeholder="No." style={{ maxWidth: 80 }} value={wardForm.number} onChange={(e) => setWardForm({ ...wardForm, number: e.target.value })} />
              <input placeholder="Ward name" value={wardForm.name} onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} />
              <button className="btn btn-accent btn-sm" onClick={addWard}>Add</button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">Areas {wardId ? "" : "(select a ward first)"}</div>
        {wardId ? (
          <>
            <table>
              <thead><tr><th>Area</th></tr></thead>
              <tbody>
                {areas.map((a) => <tr key={a.id}><td>{a.name}</td></tr>)}
                {areas.length === 0 && <tr><td className="empty">No areas yet.</td></tr>}
              </tbody>
            </table>
            <div className="inline-form">
              <input placeholder="Area name" value={areaName} onChange={(e) => setAreaName(e.target.value)} />
              <button className="btn btn-accent btn-sm" onClick={addArea}>Add</button>
            </div>
          </>
        ) : <div className="empty">Click a ward on the left to manage its areas.</div>}
      </div>
    </div>
  );
}

/* ---------- Villages ---------- */
function Villages() {
  const [districts] = useList("/districts/");
  const [districtId, setDistrictId] = useState("");
  const [bodies, setBodies] = useState([]);
  const [localBodyId, setLocalBodyId] = useState("");
  const [villages, reload] = useList(localBodyId ? `/villages/?local_body=${localBodyId}` : "");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!districtId) { setBodies([]); return; }
    client.get(`/local-bodies/?district=${districtId}&body_type=PANCHAYAT`).then((r) => setBodies(r.data.results || r.data));
  }, [districtId]);

  async function add() {
    if (!name) return;
    await client.post("/villages/", { name, local_body: localBodyId });
    setName("");
    reload();
  }

  return (
    <div className="card">
      <div className="card-title">Villages (under Panchayats)</div>
      <div className="grid-2">
        <div className="field"><label>District</label>
          <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
            <option value="">Select…</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Panchayat</label>
          <select value={localBodyId} onChange={(e) => setLocalBodyId(e.target.value)} disabled={!districtId}>
            <option value="">Select…</option>
            {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      {localBodyId && (
        <>
          <table>
            <thead><tr><th>Village</th></tr></thead>
            <tbody>
              {villages.map((v) => <tr key={v.id}><td>{v.name}</td></tr>)}
              {villages.length === 0 && <tr><td className="empty">No villages yet.</td></tr>}
            </tbody>
          </table>
          <div className="inline-form">
            <input placeholder="Village name" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-accent btn-sm" onClick={add}>Add</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Water Bodies (Lakes & Ponds) ---------- */
function WaterBodies() {
  const [districts] = useList("/districts/");
  const [districtId, setDistrictId] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [bodies, setBodies] = useState([]);
  const [localBodyId, setLocalBodyId] = useState("");
  const [wards, setWards] = useState([]);
  const [areas, setAreas] = useState([]);
  const [villages, setVillages] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", kind: "POND", ward: "", area: "", village: "",
    latitude: "", longitude: "", status: "RENOVATION_PENDING",
    water_source: "RAIN_WATER", pending_reason: "",
  });

  const usesWards = bodyType && bodyType !== "PANCHAYAT";

  useEffect(() => {
    setLocalBodyId(""); setBodies([]);
    if (districtId && bodyType) client.get(`/local-bodies/?district=${districtId}&body_type=${bodyType}`).then((r) => setBodies(r.data.results || r.data));
  }, [districtId, bodyType]);

  useEffect(() => {
    setWards([]); setVillages([]); setForm((f) => ({ ...f, ward: "", area: "", village: "" }));
    if (!localBodyId) return;
    if (usesWards) client.get(`/wards/?local_body=${localBodyId}`).then((r) => setWards(r.data.results || r.data));
    else client.get(`/villages/?local_body=${localBodyId}`).then((r) => setVillages(r.data.results || r.data));
  }, [localBodyId, usesWards]);

  useEffect(() => {
    setAreas([]);
    if (form.ward) client.get(`/areas/?ward=${form.ward}`).then((r) => setAreas(r.data.results || r.data));
  }, [form.ward]);

  async function add() {
    setError("");
    try {
      const payload = { ...form, local_body: localBodyId };
      ["ward", "area", "village"].forEach((k) => { if (!payload[k]) delete payload[k]; });
      await client.post("/water-bodies/", payload);
      setForm({ ...form, name: "", latitude: "", longitude: "", pending_reason: "" });
      alert("Water body added.");
    } catch (e) { setError(JSON.stringify(e.response?.data || "Failed")); }
  }

  return (
    <div className="card">
      <div className="card-title">Add Lake / Pond</div>
      <div className="grid-3">
        <div className="field"><label>District</label>
          <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
            <option value="">Select…</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Local Body Type</label>
          <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} disabled={!districtId}>
            <option value="">Select…</option>
            {BODY_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        <div className="field"><label>Local Body</label>
          <select value={localBodyId} onChange={(e) => setLocalBodyId(e.target.value)} disabled={!bodyType}>
            <option value="">Select…</option>
            {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {usesWards ? (
          <>
            <div className="field"><label>Ward</label>
              <select value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} disabled={!localBodyId}>
                <option value="">Select…</option>
                {wards.map((w) => <option key={w.id} value={w.id}>{w.number ? `Ward ${w.number} — ${w.name}` : w.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Area</label>
              <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} disabled={!form.ward}>
                <option value="">Select…</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </>
        ) : bodyType === "PANCHAYAT" ? (
          <div className="field"><label>Village</label>
            <select value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} disabled={!localBodyId}>
              <option value="">Select…</option>
              {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        ) : null}
      </div>

      <hr style={{ border: "none", borderTop: "1px dashed var(--border)", margin: "1rem 0" }} />

      <div className="grid-3">
        <div className="field"><label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field"><label>Type</label>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="POND">Pond</option><option value="LAKE">Lake</option>
          </select>
        </div>
        <div className="field"><label>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="UNDER_RENOVATION">Under Renovation</option>
            <option value="RENOVATION_COMPLETE">Renovation Complete</option>
            <option value="RENOVATION_PENDING">Renovation Pending</option>
            <option value="ENCROACHMENT">Encroachment</option>
            <option value="DISAPPEARED">Disappeared</option>
          </select>
        </div>
        <div className="field"><label>Latitude *</label>
          <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
        </div>
        <div className="field"><label>Longitude *</label>
          <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
        </div>
        <div className="field"><label>Water Source</label>
          <select value={form.water_source} onChange={(e) => setForm({ ...form, water_source: e.target.value })}>
            <option value="RAIN_WATER">Rain Water Only</option>
            <option value="RIVER_CONNECTION">River Connection</option>
            <option value="BOTH">Rain + River</option>
          </select>
        </div>
      </div>
      {form.status === "RENOVATION_PENDING" && (
        <div className="field"><label>Reason for pending *</label>
          <textarea rows="2" value={form.pending_reason} onChange={(e) => setForm({ ...form, pending_reason: e.target.value })} />
        </div>
      )}
      {error && <div className="error-text">{error}</div>}
      <button className="btn btn-primary" onClick={add} disabled={!localBodyId || !form.name}>Add Lake / Pond</button>
    </div>
  );
}
