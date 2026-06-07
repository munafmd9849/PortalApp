import { api } from "../../../lib/api";

export const atsScore = ({ resume, resumeText, jobDescription }) => {
  const fd = new FormData();
  if (resume) fd.append("resume", resume);
  if (resumeText) fd.append("resumeText", resumeText);
  if (jobDescription) fd.append("jobDescription", jobDescription);
  return api.post("/api/resume/ats-score", fd).then((r) => r.data);
};

export const generateStructured = ({ candidate, jobDescription, existingResumeText }) =>
  api
    .post("/api/resume/generate-structured", { candidate, jobDescription, existingResumeText })
    .then((r) => r.data);

export const exportDocx = (resume) =>
  api
    .post("/api/resume/export-docx", { resume }, { responseType: "blob" })
    .then((r) => r.data);
