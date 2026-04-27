import { Navigate, Outlet } from "react-router";
import { useAuth } from "../features/auth/hooks/useAuth";

export default function ProtectedRoute() {
  const { user, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <div className="loading-page">
        <span className="spinner spinner-lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
