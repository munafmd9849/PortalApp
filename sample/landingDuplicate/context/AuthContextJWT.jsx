import React, { createContext, useMemo, useState } from 'react';

export const AuthContext = createContext(null);

// Sample-only AuthProvider: keeps UI working, no real auth.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true);

  const login = async (_email, _password, selectedRole) => {
    const r = selectedRole || 'STUDENT';
    const mockUser = { id: 'sample-user', role: r };
    setUser(mockUser);
    setRole(r);
    return { user: mockUser, role: r, status: 'ACTIVE' };
  };

  const logout = async () => {
    setUser(null);
    setRole(null);
  };

  const registerWithEmail = async ({ role: selectedRole }) => {
    const r = selectedRole || 'STUDENT';
    const mockUser = { id: 'sample-user', role: r };
    setUser(mockUser);
    setRole(r);
    setEmailVerified(true);
    return mockUser;
  };

  const resetPassword = async () => {
    return { success: true };
  };

  const resendEmailVerification = async () => {
    return { success: true };
  };

  const checkEmailVerification = async () => true;

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      emailVerified,
      login,
      logout,
      registerWithEmail,
      resetPassword,
      resendEmailVerification,
      checkEmailVerification,
    }),
    [user, role, loading, emailVerified],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
