
const { analyseURL } = require("../services/urlAnalysisService");
const pool = require("../config/db");
const { analyseMessage } = require("../services/messageAnalysisService");
const { getGuidance } = require("../services/guidanceService");

async function analyseMessageController(req, res) {
    try {
        const { message } = req.body || {};

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid message."
            });
        }

        if (message.length > 10000) {
            return res.status(413).json({
                success: false,
                message: "Message exceeds the 10000 character limit."
            });
        }

        const result = analyseMessage(message);
        const guidanceResult = getGuidance(result);

        const dbResult = await pool.query(
            `INSERT INTO scan_history
            (user_id, scan_type, risk_score, risk_level, indicators, analysis_status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at`,
            [
                req.user.userId,
                "message",
                result.score,
                result.riskLevel,
                JSON.stringify(result.indicators),
                result.status
            ]
        );

        return res.status(200).json({
            success: true,
            scanId: dbResult.rows[0].id,
            createdAt: dbResult.rows[0].created_at,
            result,
            guidance: guidanceResult.guidance,
            guidanceDisclaimer: guidanceResult.disclaimer
        });

    } catch (error) {
        console.error("Message analysis error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to analyse the message right now."
        });
    }
}

async function analyseURLController(req, res) {
    try {
        const { url } = req.body || {};

        if (typeof url !== "string" || !url.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid URL."
            });
        }

        if (url.length > 2048) {
            return res.status(413).json({
                success: false,
                message: "URL exceeds the 2048 character limit."
            });
        }

        let result;

        try {
            result = analyseURL(url);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        const guidanceResult = getGuidance(result);

        const dbResult = await pool.query(
            `INSERT INTO scan_history
            (user_id, scan_type, risk_score, risk_level, indicators, analysis_status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at`,
            [
                req.user.userId,
                "url",
                result.score,
                result.riskLevel,
                JSON.stringify(result.indicators),
                result.status
            ]
        );

        return res.status(200).json({
            success: true,
            scanId: dbResult.rows[0].id,
            createdAt: dbResult.rows[0].created_at,
            result,
            guidance: guidanceResult.guidance,
            guidanceDisclaimer: guidanceResult.disclaimer
        });

    } catch (error) {
        console.error("URL analysis error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to analyse the URL right now."
        });
    }
}

async function getScanHistoryController(req, res) {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT id, created_at
             FROM scan_history
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            scans: result.rows
        });

    } catch (error) {
        console.error("Get scan history error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve scan history."
        });
    }
}

module.exports = {
    analyseMessageController,
    analyseURLController,
    getScanHistoryController
};
