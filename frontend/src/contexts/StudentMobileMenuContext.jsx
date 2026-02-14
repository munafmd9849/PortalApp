import React, { createContext, useContext } from 'react';

const noop = () => {};
const safeDefault = { mobileMenuOpen: false, setMobileMenuOpen: noop };

export const StudentMobileMenuContext = createContext(null);

export function useStudentMobileMenu() {
  const ctx = useContext(StudentMobileMenuContext);
  return ctx ?? safeDefault;
}
