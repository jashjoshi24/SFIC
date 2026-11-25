const express = require("express");
const router = express.Router();

const { adminLogin } = require("../controllers/adminAuthController");
const { getDashboardStats } = require("../controllers/adminDashboardController");
const adminAuth = require("../middleware/adminAuth");
const {
    getAllScans,
    getScanById
} = require("../controllers/adminScanController");

const {
    getComplaintDrafts,
    getComplaintById,
    updateComplaintStatus,
    getComplaintHistory
} = require("../controllers/adminComplaintController");


// Admin login
router.post("/login", adminLogin);

// Protected admin APIs
router.get("/me", adminAuth, (req, res) => {
    res.json({
        success: true,
        admin: req.admin
    });
});

router.get("/dashboard/stats", adminAuth, getDashboardStats);

// Scan management
router.get("/scans", adminAuth, getAllScans);
router.get("/scans/:id", adminAuth, getScanById);

// Complaint management
router.get("/complaints", adminAuth, getComplaintDrafts);
router.get("/complaints/:id", adminAuth, getComplaintById);
router.patch("/complaints/:id/status", adminAuth, updateComplaintStatus);
router.get("/complaints/:id/history", adminAuth, getComplaintHistory);

module.exports = router;