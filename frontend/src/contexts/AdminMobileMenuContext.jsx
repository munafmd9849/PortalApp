import React, { createContext, useContext } from 'react';

const noop = () => {};
const safeDefault = { mobileMenuOpen: false, setMobileMenuOpen: noop };

export const AdminMobileMenuContext = createContext(null);

export function useAdminMobileMenu() {
  const ctx = useContext(AdminMobileMenuContext);
  return ctx ?? safeDefault;
}
