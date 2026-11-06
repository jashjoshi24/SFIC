
const express = require("express");
const router = express.Router();

const {
    register,
    login,
    getMe
} = require("../controllers/authController");

const userAuth = require("../middleware/userAuth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", userAuth, getMe);

module.exports = router;
