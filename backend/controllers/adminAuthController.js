const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function adminLogin(req, res) {
    try {
        const { email, password } = req.body || {};

        if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, password_hash, role
             FROM admin_users
             WHERE email = $1 AND is_active = TRUE`,
            [email.trim().toLowerCase()]
        );

        if (!result.rows.length) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const admin = result.rows[0];

        const validPassword = await bcrypt.compare(password, admin.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        await pool.query(
            "UPDATE admin_users SET last_login = NOW() WHERE id = $1",
            [admin.id]
        );

        const token = jwt.sign(
            { sub: admin.id, role: admin.role },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error("Admin login error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to process admin login."
        });
    }
}

module.exports = { adminLogin };
