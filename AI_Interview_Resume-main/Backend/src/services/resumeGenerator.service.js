const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Tab,
  TabStopType,
  TabStopPosition,
} = require("docx");

/**
 * ATS-friendly resume generator.
 *
 * Design choices:
 *  - Single column, no tables, no text boxes, no images.
 *  - Standard fonts (Calibri), predictable section headers in UPPERCASE.
 *  - Bullets via real Word paragraphs (not glyphs), so ATS parses them as lists.
 *  - Dates on the right via a right tab stop, same as modern Word resumes.
 */

const FONT = "Calibri";
const ACCENT = "1F2937"; // charcoal, not flashy

function makeHeading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { color: ACCENT, space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 24, // 12pt
        font: FONT,
        color: ACCENT,
      }),
    ],
  });
}

function plain(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: String(text || ""),
        font: FONT,
        size: opts.size || 22, // 11pt
        bold: !!opts.bold,
        color: opts.color,
      }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text: String(text || ""), font: FONT, size: 22 })],
  });
}

function jobLine(title, company, location, dates) {
  const left = [title, company, location].filter(Boolean).join(" — ");
  return new Paragraph({
    spacing: { before: 80, after: 20 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: left, bold: true, font: FONT, size: 22 }),
      new TextRun({ children: [new Tab()] }),
      new TextRun({ text: dates || "", italics: true, font: FONT, size: 22 }),
    ],
  });
}

function header(resume) {
  const c = resume.contact || {};
  const parts = [c.email, c.phone, c.location, c.linkedin, c.github, c.portfolio]
    .filter(Boolean)
    .join(" | ");

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: resume.fullName || "",
          bold: true,
          size: 36, // 18pt
          font: FONT,
          color: ACCENT,
        }),
      ],
    }),
    resume.headline
      ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({ text: resume.headline, font: FONT, size: 22, color: "4B5563" }),
          ],
        })
      : null,
    parts
      ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: parts, font: FONT, size: 20 })],
        })
      : null,
  ].filter(Boolean);
}

function summarySection(resume) {
  if (!resume.summary) return [];
  return [makeHeading("Professional Summary"), plain(resume.summary)];
}

function skillsSection(resume) {
  const s = resume.skills || {};
  const lines = [];
  if (s.technical?.length) lines.push(["Technical", s.technical.join(", ")]);
  if (s.tools?.length) lines.push(["Tools", s.tools.join(", ")]);
  if (s.soft?.length) lines.push(["Soft Skills", s.soft.join(", ")]);
  if (!lines.length) return [];

  return [
    makeHeading("Skills"),
    ...lines.map(
      ([label, value]) =>
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${label}: `, bold: true, font: FONT, size: 22 }),
            new TextRun({ text: value, font: FONT, size: 22 }),
          ],
        })
    ),
  ];
}

function experienceSection(resume) {
  if (!resume.experience?.length) return [];
  const out = [makeHeading("Experience")];
  for (const e of resume.experience) {
    const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");
    out.push(jobLine(e.title, e.company, e.location, dates));
    for (const b of e.bullets || []) out.push(bullet(b));
  }
  return out;
}

function educationSection(resume) {
  if (!resume.education?.length) return [];
  const out = [makeHeading("Education")];
  for (const e of resume.education) {
    const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");
    out.push(jobLine(e.degree, e.institution, e.location, dates));
    if (e.details) out.push(plain(e.details));
  }
  return out;
}

function projectsSection(resume) {
  if (!resume.projects?.length) return [];
  const out = [makeHeading("Projects")];
  for (const p of resume.projects) {
    const head = [p.name, p.tech].filter(Boolean).join(" — ");
    out.push(
      new Paragraph({
        spacing: { before: 80, after: 20 },
        children: [
          new TextRun({ text: head, bold: true, font: FONT, size: 22 }),
          p.link ? new TextRun({ text: `  (${p.link})`, font: FONT, size: 20 }) : null,
        ].filter(Boolean),
      })
    );
    for (const b of p.bullets || []) out.push(bullet(b));
  }
  return out;
}

function certsSection(resume) {
  if (!resume.certifications?.length) return [];
  const out = [makeHeading("Certifications")];
  for (const c of resume.certifications) out.push(bullet(c));
  return out;
}

/**
 * Build the DOCX buffer.
 */
async function buildResumeDocx(resume) {
  const doc = new Document({
    creator: "Interview AI",
    title: `${resume.fullName || "Resume"}`,
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 } },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: "bullet",
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 360, hanging: 260 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children: [
          ...header(resume),
          ...summarySection(resume),
          ...skillsSection(resume),
          ...experienceSection(resume),
          ...projectsSection(resume),
          ...educationSection(resume),
          ...certsSection(resume),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildResumeDocx };
