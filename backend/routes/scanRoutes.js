
const express = require("express");
const router = express.Router();

const {
    analyseMessageController,
    analyseURLController,
    getScanHistoryController
} = require("../controllers/scanController");

const userAuth = require("../middleware/userAuth");

router.get("/history", userAuth, getScanHistoryController);

router.post("/message", userAuth, analyseMessageController);
router.post("/url", userAuth, analyseURLController);

module.exports = router;
    analyseURLController
} = require("../controllers/scanController");

router.post("/message", analyseMessageController);
router.post("/url", analyseURLController);

module.exports = router;
