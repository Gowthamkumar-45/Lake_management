import { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function Users() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [localBodies, setLocalBodies] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "", password: "", role: "OFFICER", designation: "",
    phone: "", district: "", local_bodies: [],
  });

  const reload = () => client.get("/users/").then((r) => setUsers(r.data.results || r.data));
  useEffect(() => { reload(); client.get("/districts/").then((r) => setDistricts(r.data.results || r.data)); }, []);
  useEffect(() => {
    if (!form.district) { setLocalBodies([]); return; }
    client.get(`/local-bodies/?district=${form.district}`).then((r) => setLocalBodies(r.data.results || r.data));
  }, [form.district]);

  async function add() {
    setError("");
    try {
      const payload = { ...form };
      if (!payload.district) delete payload.district;
      await client.post("/users/", payload);
      setForm({ username: "", password: "", role: "OFFICER", designation: "", phone: "", district: "", local_bodies: [] });
      reload();
    } catch (e) { setError(JSON.stringify(e.response?.data || "Failed")); }
  }

  function toggleBody(id) {
    const has = form.local_bodies.includes(id);
    setForm({ ...form, local_bodies: has ? form.local_bodies.filter((b) => b !== id) : [...form.local_bodies, id] });
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="muted">Manage Admins and Officers and their assigned local bodies.</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-title">All users</div>
          <table>
            <thead><tr><th>Username</th><th>Role</th><th>District</th><th>Designation</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td>{u.role_display}</td>
                  <td>{u.district_name || "—"}</td>
                  <td>{u.designation || "—"}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan="4" className="empty">No users.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title">Create user</div>
          <div className="grid-2">
            <div className="field"><label>Username</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="field"><label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="OFFICER">Officer</option>
                {isSuperAdmin && <option value="ADMIN">Admin</option>}
                {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
              </select>
            </div>
            <div className="field"><label>Designation</label>
              <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field"><label>District</label>
              <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                <option value="">—</option>
                {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          {form.role === "OFFICER" && form.district && (
            <div className="field">
              <label>Assigned local bodies</label>
              <div className="checks">
                {localBodies.map((b) => (
                  <label key={b.id} className="check">
                    <input type="checkbox" checked={form.local_bodies.includes(b.id)} onChange={() => toggleBody(b.id)} />
                    {b.name}
                  </label>
                ))}
                {localBodies.length === 0 && <span className="muted">No local bodies in this district.</span>}
              </div>
            </div>
          )}
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn-primary" onClick={add} disabled={!form.username || !form.password}>Create user</button>
        </div>
      </div>

      <style>{`
        .checks { display: flex; flex-direction: column; gap: 0.4rem; }
        .check { display: flex; align-items: center; gap: 0.5rem; font-weight: 500; color: var(--text); text-transform: none; }
        .check input { width: auto; }
      `}</style>
    </div>
  );
}
