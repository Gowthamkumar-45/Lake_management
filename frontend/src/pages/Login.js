import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Invalid username or password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="login-hero-inner">
          <div className="login-logo">💧</div>
          <h1>Lake Management System</h1>
          <p>
            Monitor, revive and protect lakes &amp; ponds across districts,
            local bodies, wards and villages — with map-based tracking and a
            stage-by-stage renovation workflow.
          </p>
          <ul className="login-points">
            <li>🗺️ Map-based water body explorer</li>
            <li>🛠️ Renovation workflow with mandatory geo-photos</li>
            <li>👥 Role-based access for Super Admin, Admin &amp; Officers</li>
          </ul>
        </div>
      </div>

      <div className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <p className="muted" style={{ marginBottom: "1.4rem" }}>
            Welcome back. Please enter your credentials.
          </p>
          <div className="field">
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: "0.6rem" }} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <div className="login-hint">
            Demo: <code>superadmin</code> / <code>admin</code> / <code>officer</code> &nbsp;·&nbsp; password <code>admin123</code>
          </div>
        </form>
      </div>
    </div>
  );
}
