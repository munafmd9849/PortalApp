import { createContext, useState, useEffect } from "react";
import { api } from "../../lib/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/auth/get-me");
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, setLoading, bootstrapping }}
    >
      {children}
    </AuthContext.Provider>
  );
};
