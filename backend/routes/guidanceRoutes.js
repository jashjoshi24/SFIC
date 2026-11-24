const express = require("express");
const router = express.Router();

const {
  getMessageGuidance
} = require("../controllers/guidanceController");

const {
  generateComplaint
} = require("../controllers/complaintController");

router.post("/", getMessageGuidance);
router.post("/complaint", generateComplaint);

module.exports = router;