
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");

require("dotenv").config();

const pool = require("./config/db");
const scanRoutes = require("./routes/scanRoutes");
const guidanceRoutes = require("./routes/guidanceRoutes");

const app = express();

// Security headers
app.use(helmet());

// Allow requests from the configured frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));

// Limit incoming JSON request size
app.use(express.json({ limit: "20kb" }));

// Rate limit scan requests
const scanLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many scan requests. Please try again later."
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts. Try again later."
    }
});

app.get("/", (req, res) => {
    res.send("SFIC Backend is running!");
});

// Database connection test
app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "NeonDB connected successfully",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error("Database test failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// API routes
app.use("/api/scans", scanLimiter, scanRoutes);
app.use("/api/guidance", guidanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authLimiter, authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`SFIC Backend running on port ${PORT}`);
});
