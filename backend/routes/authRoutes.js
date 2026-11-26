const express = require("express");
const router = express.Router();

const {
    register,
    login,
    getMe
} = require("../controllers/authController");

const userAuth = require("../middleware/userAuth");
const {rateLimit} = require('express-rate-limit');
const {updateProfile, changePassword, logoutAll} = require('../controllers/profileController');
const securityLimiter = rateLimit({windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    message: {success: false, message: 'Too many security changes. Try again later.'}});

router.post("/register", register);
router.post("/login", login);
router.get("/me", userAuth, getMe);
router.patch('/me', userAuth, updateProfile);
router.patch('/me/password', userAuth, securityLimiter, changePassword);
router.post('/logout-all', userAuth, securityLimiter, logoutAll);

const emails = require('../controllers/emailController');
router.get('/email-preferences', userAuth, emails.preferences);
router.patch('/email-preferences', userAuth, emails.preferences);
router.get('/support', userAuth, emails.supportHistory);
router.post('/support', userAuth, securityLimiter, emails.createSupport);

module.exports = router;
