const aiService = require("../services/ai.service");
const resumeParser = require("../services/resumeParser.service");
const { buildResumeDocx } = require("../services/resumeGenerator.service");

/**
 * POST /api/resume/ats-score
 * multipart: `resume` file, optional { jobDescription }
 * OR JSON: { resumeText, jobDescription? }
 */
const atsScore = async (req, res) => {
  try {
    const { jobDescription = "" } = req.body;
    let resumeText = (req.body.resumeText || "").trim();

    if (req.file) {
      resumeText = await resumeParser.extractTextFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
    }

    if (!resumeText || resumeText.length < 50) {
      return res
        .status(400)
        .json({ message: "Resume text is empty or too short. Upload a valid resume." });
    }

    const result = await aiService.scoreATS({ resumeText, jobDescription });
    res.json({ result, resumeText });
  } catch (error) {
    console.error("ATS score error:", error);
    res.status(500).json({ message: error.message || "Failed to score resume" });
  }
};

/**
 * POST /api/resume/generate-structured
 * JSON: { candidate: {...}, jobDescription?, existingResumeText? }
 * Returns structured JSON the user can edit client-side before exporting.
 */
const generateStructured = async (req, res) => {
  try {
    const { candidate = {}, jobDescription = "", existingResumeText = "" } = req.body;
    if (!candidate || Object.keys(candidate).length === 0) {
      return res.status(400).json({ message: "Candidate details are required" });
    }
    const resume = await aiService.generateATSResume({
      candidate,
      jobDescription,
      existingResumeText,
    });
    res.json({ resume });
  } catch (error) {
    console.error("Generate resume error:", error);
    res.status(500).json({ message: error.message || "Failed to generate resume" });
  }
};

/**
 * POST /api/resume/export-docx
 * JSON: { resume: <structured resume JSON> }
 * Returns .docx as a download.
 */
const exportDocx = async (req, res) => {
  try {
    const { resume } = req.body;
    if (!resume || typeof resume !== "object") {
      return res.status(400).json({ message: "Resume JSON is required" });
    }
    const buffer = await buildResumeDocx(resume);
    const filename = `${(resume.fullName || "resume").replace(/[^a-z0-9]+/gi, "_")}.docx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Export docx error:", error);
    res.status(500).json({ message: "Failed to export resume" });
  }
};

module.exports = { atsScore, generateStructured, exportDocx };
