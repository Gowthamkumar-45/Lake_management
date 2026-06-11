import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./Layout.css";

const NAV = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/explorer", label: "Explore Lakes & Ponds", icon: "🌊" },
  { to: "/map", label: "Map View", icon: "🗺️" },
  { to: "/masters", label: "Master Data", icon: "🏛️", masters: true },
  { to: "/users", label: "Users", icon: "👥", masters: true },
];

export default function Layout() {
  const { user, logout, canManageMasters } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">💧</span>
          <div>
            <div className="brand-name">Lake Management</div>
            <div className="brand-sub">Water Body Revival System</div>
          </div>
        </div>
        <nav>
          {NAV.filter((n) => !n.masters || canManageMasters).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <div className="avatar">{(user?.username || "?")[0].toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.username}</div>
              <div className="user-role">{user?.role_display || user?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
