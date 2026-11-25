
const express = require("express");
const router = express.Router();

const {
    getMessageGuidance
} = require("../controllers/guidanceController");

const {
    generateComplaint,
    getComplaintHistory
} = require("../controllers/complaintController");

const userAuth = require("../middleware/userAuth");

router.post("/", userAuth, getMessageGuidance);

router.post("/complaint", userAuth, generateComplaint);

router.get("/complaints/history", userAuth, getComplaintHistory);

module.exports = router;
  getMessageGuidance
} = require("../controllers/guidanceController");

const {
  generateComplaint
} = require("../controllers/complaintController");

router.post("/", getMessageGuidance);
router.post("/complaint", generateComplaint);

module.exports = router;
