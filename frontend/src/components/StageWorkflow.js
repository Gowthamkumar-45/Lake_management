import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import "./StageWorkflow.css";

const STAGE_STATUS = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
];

export default function StageWorkflow({ waterBodyId, canEdit, defaultCoords }) {
  const [stages, setStages] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newStage, setNewStage] = useState({ title: "", description: "" });

  const load = useCallback(() => {
    client.get(`/stages/?water_body=${waterBodyId}`).then((r) => setStages(r.data.results || r.data));
  }, [waterBodyId]);

  useEffect(() => { load(); }, [load]);

  async function addStage() {
    if (!newStage.title) return;
    await client.post("/stages/", {
      water_body: waterBodyId,
      order: stages.length + 1,
      title: newStage.title,
      description: newStage.description,
      status: "NOT_STARTED",
    });
    setNewStage({ title: "", description: "" });
    setAdding(false);
    load();
  }

  return (
    <div>
      <div className="workflow-intro card">
        <strong>📋 Stage-by-stage renovation monitoring.</strong>
        <span className="muted">
          {" "}A geo-tagged photo is <b>mandatory</b> at every stage — a stage cannot be marked
          <b> Completed</b> until at least one photo with coordinates is uploaded.
        </span>
      </div>

      <div className="timeline">
        {stages.map((stage, i) => (
          <StageCard
            key={stage.id}
            stage={stage}
            index={i}
            canEdit={canEdit}
            defaultCoords={defaultCoords}
            onChange={load}
          />
        ))}
        {stages.length === 0 && <div className="empty">No renovation stages defined yet.</div>}
      </div>

      {canEdit && (
        adding ? (
          <div className="card" style={{ marginTop: "1rem" }}>
            <div className="field">
              <label>Stage title</label>
              <input value={newStage.title} onChange={(e) => setNewStage({ ...newStage, title: e.target.value })} placeholder="e.g. De-silting" />
            </div>
            <div className="field">
              <label>Description (work to be done)</label>
              <textarea rows="2" value={newStage.description} onChange={(e) => setNewStage({ ...newStage, description: e.target.value })} />
            </div>
            <div className="flex">
              <button className="btn btn-primary btn-sm" onClick={addStage}>Add stage</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-accent" style={{ marginTop: "1rem" }} onClick={() => setAdding(true)}>
            + Add renovation stage
          </button>
        )
      )}
    </div>
  );
}

function StageCard({ stage, index, canEdit, defaultCoords, onChange }) {
  const [status, setStatus] = useState(stage.status);
  const [pendingReason, setPendingReason] = useState(stage.pending_reason || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveStatus(newStatus) {
    setError("");
    if (newStatus === "COMPLETED" && stage.photo_count === 0) {
      setError("Upload at least one geo-tagged photo before completing this stage.");
      return;
    }
    setSaving(true);
    try {
      await client.patch(`/stages/${stage.id}/`, {
        status: newStatus,
        pending_reason: newStatus === "PENDING" ? pendingReason : "",
      });
      setStatus(newStatus);
      onChange();
    } catch (e) {
      setError(e.response?.data?.detail || JSON.stringify(e.response?.data) || "Update failed");
      setStatus(stage.status);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`stage-card status-${status}`}>
      <div className="stage-dot">{index + 1}</div>
      <div className="stage-body">
        <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="stage-title">{stage.title}</div>
            {stage.description && <div className="muted" style={{ fontSize: "0.85rem" }}>{stage.description}</div>}
          </div>
          <span className={`badge badge-${status}`}>{STAGE_STATUS.find((s) => s.value === status)?.label}</span>
        </div>

        {canEdit && (
          <div className="stage-controls">
            <select value={status} onChange={(e) => saveStatus(e.target.value)} disabled={saving}>
              {STAGE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {status === "PENDING" && (
              <input
                placeholder="Reason for pending"
                value={pendingReason}
                onChange={(e) => setPendingReason(e.target.value)}
                onBlur={() => saveStatus("PENDING")}
              />
            )}
          </div>
        )}
        {status === "PENDING" && stage.pending_reason && !canEdit && (
          <div className="muted" style={{ fontSize: "0.85rem" }}>Reason: {stage.pending_reason}</div>
        )}
        {error && <div className="error-text">{error}</div>}

        <PhotoStrip stage={stage} canEdit={canEdit} defaultCoords={defaultCoords} onChange={onChange} />
      </div>
    </div>
  );
}

function PhotoStrip({ stage, canEdit, defaultCoords, onChange }) {
  const [photos, setPhotos] = useState(stage.photos || []);
  const [show, setShow] = useState(false);
  const [file, setFile] = useState(null);
  const [coords, setCoords] = useState({ latitude: defaultCoords?.[0] || "", longitude: defaultCoords?.[1] || "" });
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({ latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) });
    });
  }

  async function upload() {
    setError("");
    if (!file) { setError("Choose a photo."); return; }
    if (!coords.latitude || !coords.longitude) { setError("Geo coordinates are mandatory."); return; }
    const fd = new FormData();
    fd.append("stage", stage.id);
    fd.append("image", file);
    fd.append("latitude", coords.latitude);
    fd.append("longitude", coords.longitude);
    fd.append("caption", caption);
    setUploading(true);
    try {
      const { data } = await client.post("/stage-photos/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotos([data, ...photos]);
      setFile(null); setCaption(""); setShow(false);
      onChange();
    } catch (e) {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="photo-strip">
      <div className="flex" style={{ justifyContent: "space-between" }}>
        <div className="muted" style={{ fontSize: "0.8rem" }}>
          📸 Geo-photos ({photos.length}) {photos.length === 0 && <span style={{ color: "var(--danger)" }}>— required to complete</span>}
        </div>
        {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => setShow(!show)}>+ Upload photo</button>}
      </div>

      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((p) => (
            <a key={p.id} href={p.image_url} target="_blank" rel="noreferrer" className="thumb" title={p.caption}>
              <img src={p.image_url} alt={p.caption || "stage"} />
              <span className="thumb-geo">📍 {Number(p.latitude).toFixed(3)}, {Number(p.longitude).toFixed(3)}</span>
            </a>
          ))}
        </div>
      )}

      {show && canEdit && (
        <div className="upload-box">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          <div className="grid-2">
            <input placeholder="Latitude *" value={coords.latitude} onChange={(e) => setCoords({ ...coords, latitude: e.target.value })} />
            <input placeholder="Longitude *" value={coords.longitude} onChange={(e) => setCoords({ ...coords, longitude: e.target.value })} />
          </div>
          <input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <div className="flex">
            <button className="btn btn-ghost btn-sm" type="button" onClick={useMyLocation}>📍 Use my location</button>
            <button className="btn btn-accent btn-sm" onClick={upload} disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</button>
          </div>
          {error && <div className="error-text">{error}</div>}
        </div>
      )}
    </div>
  );
}
