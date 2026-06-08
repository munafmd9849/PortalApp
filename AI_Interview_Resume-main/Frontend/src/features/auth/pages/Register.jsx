import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import "../auth.scss";

export default function Register() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await register(form);
    if (res.ok) navigate("/dashboard");
    else setError(res.error);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="auth-subtitle">Land your next role with AI-tailored prep.</p>

        {error && <div className="alert alert-error mt-1 mb-2">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="username">Username</label>
            <input id="username" name="username" className="input" required minLength={3} value={form.username} onChange={onChange} placeholder="Pick a handle" />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" required value={form.email} onChange={onChange} placeholder="you@example.com" />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" required minLength={6} value={form.password} onChange={onChange} placeholder="At least 6 characters" />
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? <span className="spinner" /> : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
