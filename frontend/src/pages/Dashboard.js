import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";

const STATUS_META = [
  { key: "UNDER_RENOVATION", label: "Under Renovation", color: "#d97706" },
  { key: "RENOVATION_COMPLETE", label: "Renovation Complete", color: "#16a34a" },
  { key: "RENOVATION_PENDING", label: "Renovation Pending", color: "#dc2626" },
  { key: "ENCROACHMENT", label: "Encroachment", color: "#7c3aed" },
  { key: "DISAPPEARED", label: "Disappeared", color: "#64748b" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    client.get("/water-bodies/stats/").then((r) => setStats(r.data));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Welcome back, {user?.first_name || user?.username} 👋</h1>
          <p className="muted">
            Overview of lakes &amp; ponds and their renovation status.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.4rem" }}>
        <div className="flex" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Total water bodies tracked</div>
            <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--navy)" }}>
              {stats ? stats.total : "—"}
            </div>
          </div>
          <button className="btn btn-accent" onClick={() => navigate("/explorer")}>
            Explore Lakes &amp; Ponds →
          </button>
        </div>
      </div>

      <div className="grid-3">
        {STATUS_META.map((s) => (
          <div
            key={s.key}
            className="card"
            style={{ cursor: "pointer", borderTop: `4px solid ${s.color}` }}
            onClick={() => navigate(`/explorer?status=${s.key}`)}
          >
            <div className="muted" style={{ fontSize: "0.8rem" }}>{s.label}</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: s.color }}>
              {stats ? stats.by_status[s.key] : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
