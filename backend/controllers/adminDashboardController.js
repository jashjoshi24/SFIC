const pool = require("../config/db");

async function getDashboardStats(req, res) {
    try {
        const statsQuery = await pool.query(`
            SELECT
                COUNT(*) AS total_scans,
                COUNT(*) FILTER (WHERE scan_type = 'message') AS message_scans,
                COUNT(*) FILTER (WHERE scan_type = 'url') AS url_scans,
                COUNT(*) FILTER (WHERE LOWER(risk_level) = 'high') AS high_risk,
                COUNT(*) FILTER (WHERE LOWER(risk_level) = 'medium') AS medium_risk,
                COUNT(*) FILTER (WHERE LOWER(risk_level) = 'low') AS low_risk,
COUNT(*) FILTER (WHERE LOWER(risk_level) = 'safe') AS safe_scans
            FROM scan_history
        `);

        const complaintQuery = await pool.query(`
            SELECT COUNT(*) AS total_complaints
            FROM complaint_drafts
        `);

        const recentScans = await pool.query(`
            SELECT id, scan_type, risk_score, risk_level, analysis_status, created_at
            FROM scan_history
            ORDER BY created_at DESC
            LIMIT 10
        `);

        return res.json({
            success: true,
            stats: {
                ...statsQuery.rows[0],
                total_complaints: complaintQuery.rows[0].total_complaints
            },
            recent_scans: recentScans.rows
        });

    } catch (error) {
        console.error("Dashboard stats error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to load dashboard statistics."
        });
    }
}

module.exports = { getDashboardStats };
