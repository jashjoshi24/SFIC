const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function adminAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.ADMIN_JWT_SECRET
        );

        const result = await pool.query(
            `SELECT id, name, email, role
             FROM admin_users
             WHERE id = $1 AND is_active = TRUE`,
            [decoded.sub]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Admin account is inactive or does not exist."
            });
        }

        req.admin = result.rows[0];
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token."
        });
    }
}

module.exports = adminAuth;