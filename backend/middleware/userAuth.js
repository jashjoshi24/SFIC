
const jwt = require("jsonwebtoken");
const pool = require('../config/db');

async function userAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.USER_JWT_SECRET);

        if (decoded.role !== "citizen" || !decoded.userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const account = await pool.query('SELECT token_version FROM users WHERE id = $1 AND is_active = TRUE', [decoded.userId]);
        if (!account.rows.length || account.rows[0].token_version !== (decoded.tokenVersion ?? 0)) {
            return res.status(401).json({success: false, message: 'Session expired. Please sign in again.'});
        }
        req.user = { userId: decoded.userId };
        next();

    } catch (error) {
        if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
            return res.status(503).json({success: false, message: 'Account verification is temporarily unavailable. Please retry.'});
        }
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session."
        });
    }
}

module.exports = userAuth;
