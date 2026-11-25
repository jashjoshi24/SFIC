const pool = require("../config/db");

async function getAllScans(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;

        const conditions = [];
        const values = [];

        if (req.query.type) {
            const type = req.query.type.toLowerCase();

            if (!["message", "url"].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid scan type."
                });
            }

            values.push(type);
            conditions.push(`scan_type = $${values.length}`);
        }

        if (req.query.risk) {
            const risk = req.query.risk.toLowerCase();

            if (!["high", "medium", "low", "safe"].includes(risk)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid risk level."
                });
            }

            values.push(risk);
            conditions.push(`LOWER(risk_level) = $${values.length}`);
        }

        if (req.query.id) {
            if (!/^\d+$/.test(req.query.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid scan ID."
                });
            }

            values.push(req.query.id);
            conditions.push(`id = $${values.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM scan_history ${whereClause}`,
            values
        );

        const scansResult = await pool.query(
            `SELECT id, scan_type, risk_score, risk_level,
                    indicators, analysis_status, created_at
             FROM scan_history
             ${whereClause}
             ORDER BY created_at DESC
             LIMIT $${values.length + 1}
             OFFSET $${values.length + 2}`,
            [...values, limit, offset]
        );

        const total = Number(countResult.rows[0].count);

        return res.json({
            success: true,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit)
            },
            scans: scansResult.rows
        });

    } catch (error) {
        console.error("Admin scan history error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve scan history."
        });
    }
}


async function getScanById(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid scan ID."
            });
        }

        const scanResult = await pool.query(
            `SELECT *
             FROM scan_history
             WHERE id = $1`,
            [id]
        );

        if (!scanResult.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Scan not found."
            });
        }

        const complaintResult = await pool.query(
            `SELECT
                id,
                incident_description,
                incident_date,
                amount,
                transaction_id,
                platform,
                status,
                created_at
             FROM complaint_drafts
             WHERE scan_id = $1
             ORDER BY created_at DESC`,
            [id]
        );

        return res.json({
            success: true,
            scan: scanResult.rows[0],
            related_complaints: complaintResult.rows
        });

    } catch (error) {
        console.error("Admin scan detail error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve scan details."
        });
    }
}

module.exports = {
    getAllScans,
    getScanById
};