import { api } from "../../../lib/api";

export const analyze = ({ resume, resumeText, jobDescription, jobTitle, company }) => {
  const fd = new FormData();
  if (resume) fd.append("resume", resume);
  if (resumeText) fd.append("resumeText", resumeText);
  fd.append("jobDescription", jobDescription);
  fd.append("jobTitle", jobTitle || "");
  fd.append("company", company || "");
  return api.post("/api/interview/analyze", fd).then((r) => r.data);
};

export const listReports = () =>
  api.get("/api/interview/reports").then((r) => r.data);

export const getReport = (id) =>
  api.get(`/api/interview/reports/${id}`).then((r) => r.data);

export const deleteReport = (id) =>
  api.delete(`/api/interview/reports/${id}`).then((r) => r.data);
