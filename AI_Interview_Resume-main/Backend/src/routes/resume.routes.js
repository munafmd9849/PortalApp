const { Router } = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const ctrl = require("../controller/resume.controller");

const router = Router();

router.post("/ats-score", authUser, upload.single("resume"), ctrl.atsScore);
router.post("/generate-structured", authUser, ctrl.generateStructured);
router.post("/export-docx", authUser, ctrl.exportDocx);

module.exports = router;
