import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import WaterBodyMap from "../components/WaterBodyMap";
import StageWorkflow from "../components/StageWorkflow";
import { useAuth } from "../auth/AuthContext";
import "./WaterBodyDetail.css";

const TABS = ["Overview", "Renovation Workflow", "Workforce", "Equipment", "Funds"];

export default function WaterBodyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOfficer, canManageMasters } = useAuth();
  const canEdit = isOfficer || canManageMasters;

  const [wb, setWb] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [workers, setWorkers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [funds, setFunds] = useState([]);

  const load = useCallback(() => {
    client.get(`/water-bodies/${id}/`).then((r) => setWb(r.data));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    client.get(`/workers/?water_body=${id}`).then((r) => setWorkers(r.data.results || r.data));
    client.get(`/equipment/?water_body=${id}`).then((r) => setEquipment(r.data.results || r.data));
    client.get(`/fund-entries/?water_body=${id}`).then((r) => setFunds(r.data.results || r.data));
  }, [id]);

  if (!wb) return <div className="empty">Loading…</div>;

  const locationPath = [
    wb.local_body_name,
    wb.ward_name && `Ward: ${wb.ward_name}`,
    wb.area_name,
    wb.village_name,
  ].filter(Boolean).join(" › ");

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: "1rem" }}>
        ← Back
      </button>

      <div className="wb-header card">
        <div>
          <div className="flex" style={{ gap: "0.7rem" }}>
            <h1 style={{ margin: 0 }}>{wb.name}</h1>
            <StatusBadge value={wb.status} label={wb.status_display} />
          </div>
          <div className="muted" style={{ marginTop: "0.3rem" }}>
            {wb.kind_display} · {locationPath}
          </div>
        </div>
        <div className="wb-quickstats">
          <div><span className="qs-num">{wb.area_acres || "—"}</span><span className="qs-lbl">Acres</span></div>
          <div><span className="qs-num">₹{Number(wb.total_funds_used).toLocaleString("en-IN")}</span><span className="qs-lbl">Funds used</span></div>
          <div><span className="qs-num">{workers.reduce((s, w) => s + w.count, 0)}</span><span className="qs-lbl">Workers</span></div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <Overview wb={wb} canEdit={canEdit} onSaved={load} />
      )}
      {tab === "Renovation Workflow" && (
        <StageWorkflow waterBodyId={id} canEdit={canEdit} defaultCoords={[wb.latitude, wb.longitude]} />
      )}
      {tab === "Workforce" && (
        <Workforce waterBodyId={id} workers={workers} setWorkers={setWorkers} canEdit={canEdit} />
      )}
      {tab === "Equipment" && (
        <EquipmentTab waterBodyId={id} equipment={equipment} setEquipment={setEquipment} canEdit={canEdit} />
      )}
      {tab === "Funds" && (
        <FundsTab waterBodyId={id} funds={funds} setFunds={setFunds} canEdit={canEdit} onChange={load} />
      )}
    </div>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ wb, canEdit, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(wb);
  const [error, setError] = useState("");

  function set(k, v) { setForm({ ...form, [k]: v }); }

  async function save() {
    setError("");
    try {
      await client.patch(`/water-bodies/${wb.id}/`, {
        status: form.status,
        pending_reason: form.pending_reason,
        water_source: form.water_source,
        capacity_litres: form.capacity_litres || null,
        area_acres: form.area_acres || null,
        revived_by: form.revived_by,
        revived_by_name: form.revived_by_name,
        incharge_name: form.incharge_name,
        incharge_contact: form.incharge_contact,
      });
      setEdit(false);
      onSaved();
    } catch (e) {
      setError(JSON.stringify(e.response?.data) || "Save failed");
    }
  }

  return (
    <div className="grid-2">
      <div className="card">
        <div className="flex" style={{ justifyContent: "space-between" }}>
          <div className="card-title">Details</div>
          {canEdit && !edit && <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>Edit</button>}
        </div>

        {edit ? (
          <>
            <div className="field">
              <label>Status / Category</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="UNDER_RENOVATION">Under Renovation</option>
                <option value="RENOVATION_COMPLETE">Renovation Complete</option>
                <option value="RENOVATION_PENDING">Renovation Pending</option>
                <option value="ENCROACHMENT">Encroachment</option>
                <option value="DISAPPEARED">Disappeared</option>
              </select>
            </div>
            {form.status === "RENOVATION_PENDING" && (
              <div className="field">
                <label>Reason for pending *</label>
                <textarea rows="2" value={form.pending_reason || ""} onChange={(e) => set("pending_reason", e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Water Source</label>
              <select value={form.water_source} onChange={(e) => set("water_source", e.target.value)}>
                <option value="RAIN_WATER">Rain Water Only</option>
                <option value="RIVER_CONNECTION">River Connection</option>
                <option value="BOTH">Rain Water + River Connection</option>
              </select>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Capacity (litres)</label>
                <input type="number" value={form.capacity_litres || ""} onChange={(e) => set("capacity_litres", e.target.value)} />
              </div>
              <div className="field">
                <label>Area (acres)</label>
                <input type="number" step="0.01" value={form.area_acres || ""} onChange={(e) => set("area_acres", e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Revived By</label>
                <select value={form.revived_by || ""} onChange={(e) => set("revived_by", e.target.value)}>
                  <option value="">—</option>
                  <option value="NGO">NGO</option>
                  <option value="LOCAL_TEAM">Local Team</option>
                  <option value="GOVERNMENT">Government</option>
                </select>
              </div>
              <div className="field">
                <label>Revived By (name)</label>
                <input value={form.revived_by_name || ""} onChange={(e) => set("revived_by_name", e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Incharge name</label>
                <input value={form.incharge_name || ""} onChange={(e) => set("incharge_name", e.target.value)} />
              </div>
              <div className="field">
                <label>Incharge contact</label>
                <input value={form.incharge_contact || ""} onChange={(e) => set("incharge_contact", e.target.value)} />
              </div>
            </div>
            {error && <div className="error-text">{error}</div>}
            <div className="flex">
              <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setForm(wb); setEdit(false); }}>Cancel</button>
            </div>
          </>
        ) : (
          <dl className="detail-list">
            <Row label="Category" value={<StatusBadge value={wb.status} label={wb.status_display} />} />
            {wb.status === "RENOVATION_PENDING" && <Row label="Pending reason" value={wb.pending_reason || "—"} />}
            <Row label="Water source" value={wb.water_source_display} />
            <Row label="Capacity" value={wb.capacity_litres ? `${Number(wb.capacity_litres).toLocaleString("en-IN")} L` : "—"} />
            <Row label="Area" value={wb.area_acres ? `${wb.area_acres} acres` : "—"} />
            <Row label="Revived by" value={wb.revived_by_display ? `${wb.revived_by_display} ${wb.revived_by_name ? "— " + wb.revived_by_name : ""}` : "—"} />
            <Row label="Incharge" value={wb.incharge_display || "—"} />
            <Row label="Incharge contact" value={wb.incharge_contact || "—"} />
            <Row label="Coordinates" value={`${wb.latitude}, ${wb.longitude}`} />
          </dl>
        )}
      </div>

      <div className="card">
        <div className="card-title">Map</div>
        <div style={{ height: 420, borderRadius: 12, overflow: "hidden" }}>
          <WaterBodyMap
            markers={[{ ...wb, selected: true }]}
            center={[Number(wb.latitude), Number(wb.longitude)]}
            zoom={15}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/* ---------------- Workforce ---------------- */
function Workforce({ waterBodyId, workers, setWorkers, canEdit }) {
  const [form, setForm] = useState({ gender: "MALE", designation: "", count: 1, name: "" });

  async function add() {
    if (!form.designation) return;
    const { data } = await client.post("/workers/", { ...form, water_body: waterBodyId });
    setWorkers([...workers, data]);
    setForm({ gender: "MALE", designation: "", count: 1, name: "" });
  }
  async function remove(id) {
    await client.delete(`/workers/${id}/`);
    setWorkers(workers.filter((w) => w.id !== id));
  }

  const male = workers.filter((w) => w.gender === "MALE");
  const female = workers.filter((w) => w.gender === "FEMALE");
  const sum = (arr) => arr.reduce((s, w) => s + w.count, 0);

  return (
    <div>
      <div className="grid-2" style={{ marginBottom: "1.4rem" }}>
        <div className="card stat-card stat-male">
          <div className="qs-lbl">Male workers</div>
          <div className="qs-num">{sum(male)}</div>
        </div>
        <div className="card stat-card stat-female">
          <div className="qs-lbl">Female workers</div>
          <div className="qs-num">{sum(female)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Workforce (by gender &amp; designation)</div>
        <table>
          <thead><tr><th>Name</th><th>Gender</th><th>Designation</th><th>Count</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id}>
                <td>{w.name || "—"}</td>
                <td>{w.gender_display}</td>
                <td>{w.designation}</td>
                <td>{w.count}</td>
                {canEdit && <td><button className="btn btn-danger btn-sm" onClick={() => remove(w.id)}>Remove</button></td>}
              </tr>
            ))}
            {workers.length === 0 && <tr><td colSpan="5" className="empty">No workforce recorded yet.</td></tr>}
          </tbody>
        </table>

        {canEdit && (
          <div className="inline-form">
            <input placeholder="Name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            <input placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <input type="number" min="1" style={{ width: 80 }} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} />
            <button className="btn btn-accent btn-sm" onClick={add}>Add</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Equipment ---------------- */
function EquipmentTab({ waterBodyId, equipment, setEquipment, canEdit }) {
  const [form, setForm] = useState({ name: "", quantity: 1, notes: "" });
  async function add() {
    if (!form.name) return;
    const { data } = await client.post("/equipment/", { ...form, water_body: waterBodyId });
    setEquipment([...equipment, data]);
    setForm({ name: "", quantity: 1, notes: "" });
  }
  async function remove(id) {
    await client.delete(`/equipment/${id}/`);
    setEquipment(equipment.filter((e) => e.id !== id));
  }
  return (
    <div className="card">
      <div className="card-title">Machines &amp; Equipment used</div>
      <table>
        <thead><tr><th>Equipment</th><th>Qty</th><th>Notes</th>{canEdit && <th></th>}</tr></thead>
        <tbody>
          {equipment.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td><td>{e.quantity}</td><td>{e.notes || "—"}</td>
              {canEdit && <td><button className="btn btn-danger btn-sm" onClick={() => remove(e.id)}>Remove</button></td>}
            </tr>
          ))}
          {equipment.length === 0 && <tr><td colSpan="4" className="empty">No equipment recorded yet.</td></tr>}
        </tbody>
      </table>
      {canEdit && (
        <div className="inline-form">
          <input placeholder="Equipment name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="number" min="1" style={{ width: 80 }} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn btn-accent btn-sm" onClick={add}>Add</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Funds ---------------- */
function FundsTab({ waterBodyId, funds, setFunds, canEdit, onChange }) {
  const [form, setForm] = useState({ purpose: "", amount: "", spent_on: "" });
  const total = funds.reduce((s, f) => s + Number(f.amount), 0);

  async function add() {
    if (!form.purpose || !form.amount) return;
    const payload = { ...form, water_body: waterBodyId };
    if (!payload.spent_on) delete payload.spent_on;
    const { data } = await client.post("/fund-entries/", payload);
    setFunds([data, ...funds]);
    setForm({ purpose: "", amount: "", spent_on: "" });
    onChange && onChange();
  }
  async function remove(id) {
    await client.delete(`/fund-entries/${id}/`);
    setFunds(funds.filter((f) => f.id !== id));
    onChange && onChange();
  }
  return (
    <div className="card">
      <div className="flex" style={{ justifyContent: "space-between" }}>
        <div className="card-title">Money used for revival</div>
        <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: "1.2rem" }}>
          ₹{total.toLocaleString("en-IN")}
        </div>
      </div>
      <table>
        <thead><tr><th>Purpose</th><th>Amount</th><th>Spent on</th>{canEdit && <th></th>}</tr></thead>
        <tbody>
          {funds.map((f) => (
            <tr key={f.id}>
              <td>{f.purpose}</td>
              <td>₹{Number(f.amount).toLocaleString("en-IN")}</td>
              <td>{f.spent_on || "—"}</td>
              {canEdit && <td><button className="btn btn-danger btn-sm" onClick={() => remove(f.id)}>Remove</button></td>}
            </tr>
          ))}
          {funds.length === 0 && <tr><td colSpan="4" className="empty">No fund entries yet.</td></tr>}
        </tbody>
      </table>
      {canEdit && (
        <div className="inline-form">
          <input placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input type="date" value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} />
          <button className="btn btn-accent btn-sm" onClick={add}>Add</button>
        </div>
      )}
    </div>
  );
}
