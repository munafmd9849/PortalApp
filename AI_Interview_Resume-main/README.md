# Interview AI

AI-powered interview prep + ATS resume tooling, built on **Mistral**.

Paste any job description, drop in your resume, and get:

- An **ATS score** with a 5-dimension breakdown and concrete fixes
- A **job-match report** with strengths, weaknesses, and missing keywords
- **12 tailored interview questions** (technical / behavioral / situational / role-specific) with sample answer outlines
- **Skill-gap analysis** with concrete learning plans
- A **4-week prep plan** with weekly actions and resources
- A **resume builder** that generates an ATS-friendly `.docx` tailored to a target JD
                                                                      
---

## Stack

| Layer     | Tech                                                    |
| --------- | ------------------------------------------------------- |
| Frontend  | React 19 · Vite · SCSS · React Router v7 · Axios        |
| Backend   | Node · Express · MongoDB (Mongoose) · JWT cookies      |
| AI        | Mistral (`mistral-large-latest`) in JSON mode           |
| Parsing   | `pdf-parse` for PDFs, raw XML strip for DOCX            |
| Docx      | `docx` library (ATS-safe single-column template)        |

---

## Quick start

### 1. Backend

```bash
cd Backend
npm install
cp .env.example .env   # or edit the existing .env
npm run dev
```

Server runs on `http://localhost:3000`.

**Required env vars (`Backend/.env`):**

```
PORT=3000
MONGO_URI=mongodb+srv://...
JWT_SECRET=<something-long-and-random>
MISTRAL_API_KEY=<your-mistral-key>
# optional:
CLIENT_URL=http://localhost:5173
MISTRAL_MODEL=mistral-large-latest
```

> ⚠️ The `.env` shipped with this project contains real credentials from an earlier development session. **Rotate them before deploying anywhere.**

### 2. Frontend

```bash
cd Frontend
npm install
npm run dev
```

App runs on `http://localhost:5173`.

If your backend is on a different host, create `Frontend/.env.local`:

```
VITE_API_URL=http://localhost:3000
```

---

## API reference

All authenticated routes accept either the `token` cookie (set on login) or an `Authorization: Bearer <jwt>` header.

### Auth

| Method | Path                    | Body                                | Auth |
| ------ | ----------------------- | ----------------------------------- | ---- |
| POST   | `/api/auth/register`    | `{ username, email, password }`     | —    |
| POST   | `/api/auth/login`       | `{ email, password }`               | —    |
| GET    | `/api/auth/logout`      | —                                   | —    |
| GET    | `/api/auth/get-me`      | —                                   | ✅   |

### Interview

| Method | Path                           | Body / Params                                                                 |
| ------ | ------------------------------ | ----------------------------------------------------------------------------- |
| POST   | `/api/interview/analyze`       | `multipart/form-data`: `resume` file + `jobDescription`, `jobTitle`, `company` |
| GET    | `/api/interview/reports`       | —                                                                             |
| GET    | `/api/interview/reports/:id`   | —                                                                             |
| DELETE | `/api/interview/reports/:id`   | —                                                                             |

### Resume

| Method | Path                                | Body                                                                |
| ------ | ----------------------------------- | ------------------------------------------------------------------- |
| POST   | `/api/resume/ats-score`             | `multipart`: `resume` file + optional `jobDescription`              |
| POST   | `/api/resume/generate-structured`   | JSON: `{ candidate, jobDescription?, existingResumeText? }`         |
| POST   | `/api/resume/export-docx`           | JSON: `{ resume }` → returns a `.docx` file                          |

---

## Project structure

```
Backend/
├── server.js
└── src/
    ├── app.js
    ├── config/db.js
    ├── models/         (User, BlacklistToken, InterviewReport)
    ├── middlewares/    (auth, upload)
    ├── services/
    │   ├── ai.service.js               ← Mistral prompts, JSON mode
    │   ├── resumeParser.service.js     ← PDF / DOCX / TXT → text
    │   └── resumeGenerator.service.js  ← structured JSON → .docx
    ├── controller/     (auth, interview, resume)
    └── routes/         (auth, interview, resume)

Frontend/
└── src/
    ├── App.jsx · main.jsx · app.routes.jsx · style.scss
    ├── lib/api.js                 ← shared axios client
    ├── components/                ← Layout, ProtectedRoute
    └── features/
        ├── auth/                  ← Login, Register, context, hook
        ├── landing/               ← Landing page
        ├── interview/             ← Dashboard, NewAnalysis, ReportView
        └── resume/                ← AtsChecker, ResumeBuilder
```

---

## How the AI calls are shaped

All three Mistral flows use **JSON mode** (`responseFormat: { type: "json_object" }`) and a strict schema in the prompt. Every response is defensively sanitised server-side before being returned to the client — we never trust raw model output.

- `analyzeInterview()` → ATS score + match % + strengths/weaknesses + 4–7 skill gaps + exactly 12 interview questions + 4-week plan
- `scoreATS()` → lightweight standalone scorer with 5 sub-scores and concrete fixes
- `generateATSResume()` → structured resume JSON that the `docx` library turns into a clean, ATS-parseable Word document

Prompts are in `Backend/src/services/ai.service.js` — tune them freely.

---

## What's ATS-friendly about the generated resume?

- Single column, no tables, no text boxes, no images
- Standard fonts (Calibri) at readable sizes
- Real Word bullets (not glyphs) so parsers detect lists correctly
- Dates on the right via a tab stop (same pattern as Word's built-in templates)
- Clear UPPERCASE section headers with thin underline
- Keywords from the JD surfaced in a dedicated block so ATS keyword scanning picks them up

---

## Roadmap / nice-to-haves

- [ ] PDF export (currently `.docx` only)
- [ ] Mock interview mode (timed, voice-input)
- [ ] Resume versioning per role
- [ ] Compare two JDs against one resume
- [ ] Public shareable report link (read-only)

---

## License

MIT.
