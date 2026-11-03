
const jwt = require("jsonwebtoken");

function userAuth(req, res, next) {
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

        req.user = { userId: decoded.userId };
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session."
        });
    }
}

module.exports = userAuth;
