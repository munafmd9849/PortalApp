const multer = require("multer");

/**
 * We keep uploads in memory — after parsing the PDF to text
 * we have no reason to persist the binary.
 */
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only PDF, DOC, DOCX, or TXT files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
});

module.exports = upload;
