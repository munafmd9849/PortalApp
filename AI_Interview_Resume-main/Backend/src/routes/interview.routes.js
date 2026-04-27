const { Router } = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const ctrl = require("../controller/interview.controller");

const router = Router();

router.post("/analyze", authUser, upload.single("resume"), ctrl.analyze);
router.get("/reports", authUser, ctrl.listReports);
router.get("/reports/:id", authUser, ctrl.getReport);
router.delete("/reports/:id", authUser, ctrl.deleteReport);

module.exports = router;
