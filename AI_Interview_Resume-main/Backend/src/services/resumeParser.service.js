const pdfParse = require("pdf-parse");

/**
 * Extracts plain text from a resume file buffer.
 * Supports PDF, DOCX (best-effort via raw unzip of document.xml), and plain text.
 */
async function extractTextFromBuffer(buffer, mimetype, originalname = "") {
  const ext = (originalname.split(".").pop() || "").toLowerCase();

  try {
    if (mimetype === "application/pdf" || ext === "pdf") {
      const data = await pdfParse(buffer);
      return cleanText(data.text);
    }

    if (mimetype === "text/plain" || ext === "txt") {
      return cleanText(buffer.toString("utf8"));
    }

    // DOCX / DOC — basic XML strip, works for most DOCX files without an extra lib.
    if (
      mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword" ||
      ext === "docx" ||
      ext === "doc"
    ) {
      // DOCX is a zip; we do a naive extract by pulling visible text runs.
      // For a production build you would use `mammoth`, but this keeps the
      // dependency list light and works for typical resumes.
      const AdmZip = tryRequire("adm-zip");
      if (AdmZip) {
        const zip = new AdmZip(buffer);
        const doc = zip.getEntry("word/document.xml");
        if (doc) {
          const xml = doc.getData().toString("utf8");
          return cleanText(stripXml(xml));
        }
      }
      // Fallback: pretend it's text, gives garbage if binary but won't crash.
      return cleanText(buffer.toString("utf8"));
    }

    throw new Error("Unsupported file type");
  } catch (err) {
    console.error("Resume parse error:", err.message);
    throw new Error("Could not read the resume. Please upload a clean PDF.");
  }
}

function tryRequire(name) {
  try {
    return require(name);
  } catch {
    return null;
  }
}

function stripXml(xml) {
  return xml
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(text) {
  return (text || "")
    .replace(/\r/g, "")
    .replace(/[\t\x0B\f]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

module.exports = { extractTextFromBuffer };
