import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children, requireMasters }) {
  const { user, canManageMasters } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireMasters && !canManageMasters) return <Navigate to="/" replace />;
  return children;
}
