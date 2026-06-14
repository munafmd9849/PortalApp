const prisma = require("../config/prisma");
const aiService = require("../services/ai.service");
const resumeParser = require("../services/resumeParser.service");

/**
 * Helper to stringify nested objects for SQLite storage
 */
const stringifyReportFields = (data) => {
  const fields = [
    "atsBreakdown",
    "matchedKeywords",
    "missingKeywords",
    "atsSuggestions",
    "strengths",
    "weaknesses",
    "skillGaps",
    "interviewQuestions",
    "preparationPlan",
  ];
  const obj = { ...data };
  fields.forEach((f) => {
    if (obj[f]) obj[f] = JSON.stringify(obj[f]);
  });
  return obj;
};

/**
 * Helper to parse nested objects from SQLite storage
 */
const parseReportFields = (report) => {
  if (!report) return null;
  const fields = [
    "atsBreakdown",
    "matchedKeywords",
    "missingKeywords",
    "atsSuggestions",
    "strengths",
    "weaknesses",
    "skillGaps",
    "interviewQuestions",
    "preparationPlan",
  ];
  fields.forEach((f) => {
    if (report[f] && typeof report[f] === "string") {
      try {
        report[f] = JSON.parse(report[f]);
      } catch (e) {
        console.error(`Failed to parse field ${f}:`, e);
      }
    }
  });
  return report;
};

const analyze = async (req, res) => {
  try {
    const { jobDescription, jobTitle = "", company = "" } = req.body;
    if (!jobDescription || jobDescription.trim().length < 30) {
      return res
        .status(400)
        .json({ message: "Job description is required (min 30 characters)" });
    }

    let resumeText = (req.body.resumeText || "").trim();
    let resumeFileName = "";

    if (req.file) {
      resumeText = await resumeParser.extractTextFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
      resumeFileName = req.file.originalname;
    }

    if (!resumeText || resumeText.length < 50) {
      return res
        .status(400)
        .json({ message: "Resume text is empty or too short. Upload a valid resume." });
    }

    console.log(`[Controller] Analyze request received for user ${req.userId}`);
    const { analysis, raw } = await aiService.analyzeInterview({
      resumeText,
      jobDescription,
      jobTitle,
      company,
    });
    console.log(`[Controller] AI analysis success for user ${req.userId}`);

    const reportData = stringifyReportFields({
      userId: parseInt(req.userId),
      jobTitle,
      company,
      jobDescription,
      resumeText,
      resumeFileName,
      ...analysis,
      rawModelOutput: raw,
    });

    const report = await prisma.interviewReport.create({
      data: reportData,
    });

    res.status(201).json({ message: "Analysis complete", report: parseReportFields(report) });
  } catch (error) {
    console.error("Interview analyze error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to analyze — please try again" });
  }
};

const listReports = async (req, res) => {
  try {
    const userId = parseInt(req.userId);
    if (isNaN(userId)) {
      return res.status(401).json({ message: "Unauthorized: Invalid user ID" });
    }

    const reports = await prisma.interviewReport.findMany({
      where: { userId },
      select: {
        id: true,
        jobTitle: true,
        company: true,
        atsScore: true,
        matchPercentage: true,
        createdAt: true,
        resumeFileName: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ reports });
  } catch (error) {
    console.error("List reports error:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

const getReport = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      console.warn("Get report: Invalid ID provided:", req.params.id);
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await prisma.interviewReport.findUnique({
      where: { id },
    });

    // Check ownership
    const userId = parseInt(req.userId);
    if (!report || report.userId !== userId) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({ report: parseReportFields(report) });
  } catch (error) {
    console.error("Get report error:", error);
    res.status(500).json({ message: "Failed to fetch report" });
  }
};

const deleteReport = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await prisma.interviewReport.findUnique({
      where: { id },
    });

    const userId = parseInt(req.userId);
    if (!report || report.userId !== userId) {
      return res.status(404).json({ message: "Report not found" });
    }

    await prisma.interviewReport.delete({
      where: { id },
    });

    res.json({ message: "Report deleted" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ message: "Failed to delete report" });
  }
};

module.exports = { analyze, listReports, getReport, deleteReport };
