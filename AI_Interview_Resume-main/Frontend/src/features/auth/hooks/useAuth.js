import { useContext } from "react";
import { AuthContext } from "../auth.context";
import * as authApi from "../services/auth.api";
import { apiError } from "../../../lib/api";

export const useAuth = () => {
  const { user, setUser, loading, setLoading, bootstrapping } = useContext(AuthContext);

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: apiError(err, "Login failed") };
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async ({ username, email, password }) => {
    setLoading(true);
    try {
      const data = await authApi.register({ username, email, password });
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: apiError(err, "Registration failed") };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    bootstrapping,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
};
