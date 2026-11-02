
const express = require("express");
const router = express.Router();

const {
    analyseMessageController,
    analyseURLController
} = require("../controllers/scanController");

router.post("/message", analyseMessageController);
router.post("/url", analyseURLController);

module.exports = router;
