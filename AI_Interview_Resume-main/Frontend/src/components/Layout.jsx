import { Outlet, NavLink, useNavigate, Link } from "react-router";
import { useAuth } from "../features/auth/hooks/useAuth";
import "./layout.scss";

export default function Layout() {
  const { user, logout, bootstrapping } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (bootstrapping) {
    return (
      <div className="loading-page">
        <span className="spinner spinner-lg" />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to={user ? "/dashboard" : "/"} className="brand">
            <span className="brand-mark">◆</span>
            <span className="brand-name">Interview<span className="brand-ai">AI</span></span>
          </Link>

          {user && (
            <nav className="nav">
              <NavLink to="/dashboard" className={({isActive}) => isActive ? "active" : ""}>Dashboard</NavLink>
              <NavLink to="/analyze" className={({isActive}) => isActive ? "active" : ""}>New analysis</NavLink>
              <NavLink to="/ats" className={({isActive}) => isActive ? "active" : ""}>ATS check</NavLink>
              <NavLink to="/resume-builder" className={({isActive}) => isActive ? "active" : ""}>Resume builder</NavLink>
            </nav>
          )}

          <div className="topbar-right">
            {user ? (
              <>
                <span className="user-chip" title={user.email}>
                  <span className="user-avatar">{(user.username || user.email || "?")[0].toUpperCase()}</span>
                  <span className="user-name">{user.username}</span>
                </span>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="container">
          <span>Interview AI · Powered by Mistral</span>
        </div>
      </footer>
    </div>
  );
}
