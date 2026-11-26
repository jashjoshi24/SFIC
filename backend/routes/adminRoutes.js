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

const { getCitizens, getActivityReport } = require('../controllers/adminWorkspaceController');
router.get('/citizens', adminAuth, getCitizens);
router.get('/reports', adminAuth, getActivityReport);

const awareness = require('../controllers/awarenessController');
router.get('/awareness', adminAuth, awareness.adminGuides);
router.post('/awareness', adminAuth, awareness.createGuide);
router.put('/awareness/:id', adminAuth, awareness.updateGuide);
router.delete('/awareness/:id', adminAuth, awareness.deleteGuide);
router.post('/awareness/:id/restore', adminAuth, awareness.restoreGuide);

// Scan management
router.get("/scans", adminAuth, getAllScans);
router.get("/scans/:id", adminAuth, getScanById);

// Complaint management
router.get("/complaints", adminAuth, getComplaintDrafts);
router.get("/complaints/:id", adminAuth, getComplaintById);
router.patch("/complaints/:id/status", adminAuth, updateComplaintStatus);
router.get("/complaints/:id/history", adminAuth, getComplaintHistory);

const emails = require('../controllers/emailController');
const emailLimiter = require('express-rate-limit').rateLimit({windowMs:15*60*1000, limit:10, standardHeaders:'draft-8', legacyHeaders:false});
router.get('/emails', adminAuth, emails.overview);
router.post('/emails/preview', adminAuth, emails.preview);
router.post('/emails/campaigns', adminAuth, emailLimiter, emails.queueCampaign);
router.post('/emails/campaigns/:id/send', adminAuth, emails.sendCampaign);
router.patch('/emails/support/:id/close', adminAuth, emails.closeSupport);

module.exports = router;
