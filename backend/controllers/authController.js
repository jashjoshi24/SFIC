
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const JWT_SECRET = process.env.USER_JWT_SECRET;

function createToken(user) {
    return jwt.sign(
        { userId: user.id, role: "citizen" },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

async function register(req, res) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 2 || cleanName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name must contain 2 to 100 characters."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address."
            });
        }

        if (typeof password !== "string" ||
            password.length < 8 ||
            password.length > 72) {
            return res.status(400).json({
                success: false,
                message: "Password must be 8 to 72 characters."
            });
        }

        const existing = await pool.query(
            "SELECT id FROM users WHERE LOWER(email) = $1",
            [cleanEmail]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [cleanName, cleanEmail, passwordHash]
        );

        const user = result.rows[0];

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            token: createToken(user),
            user
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create account."
        });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, password_hash, is_active
             FROM users
             WHERE LOWER(email) = $1`,
            [email.trim().toLowerCase()]
        );

        const user = result.rows[0];

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        return res.json({
            success: true,
            message: "Login successful.",
            token: createToken(user),
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to login."
        });
    }
}

async function getMe(req, res) {
    try {
        const result = await pool.query(
            `SELECT id, name, email, created_at
             FROM users
             WHERE id = $1 AND is_active = TRUE`,
            [req.user.userId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "User account not found."
            });
        }

        return res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Get profile error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch profile."
        });
    }
}

module.exports = { register, login, getMe };
