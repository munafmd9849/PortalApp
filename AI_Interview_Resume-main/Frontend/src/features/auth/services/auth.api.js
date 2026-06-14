import { api } from "../../../lib/api";

export const register = ({ username, email, password }) =>
  api.post("/api/auth/register", { username, email, password }).then((r) => r.data);

export const login = ({ email, password }) =>
  api.post("/api/auth/login", { email, password }).then((r) => r.data);

export const logout = () =>
  api.get("/api/auth/logout").then((r) => r.data);

export const getMe = () =>
  api.get("/api/auth/get-me").then((r) => r.data);
