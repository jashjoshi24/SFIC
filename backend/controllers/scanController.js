
const { analyseURLHybrid } = require("../services/urlAnalysisService");
const pool = require("../config/db");
const { analyseMessage } = require("../services/messageAnalysisService");
const { getGuidance } = require("../services/guidanceService");

// ============================================
// MESSAGE ANALYSIS CONTROLLER
// ============================================

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

        // Analyse the submitted message.
        const result = analyseMessage(message);

        // Generate safety guidance.
        const guidanceResult = getGuidance(result);

        // Save scan metadata, not the original message.
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
        console.error("Message analysis error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to analyse the message right now."
        });
    }
}

// ============================================
// URL ANALYSIS CONTROLLER
// ============================================

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
            // Run URL heuristics and Google threat lookups.
            result = await analyseURLHybrid(url);
        } catch (error) {
            // Invalid URL errors should return a client error.
            const clientErrorPatterns = [
                "URL",
                "HTTP",
                "character",
                "hostname"
            ];

            if (
                clientErrorPatterns.some(pattern =>
                    error.message?.toLowerCase().includes(pattern.toLowerCase())
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            throw error;
        }

        // Generate guidance using the combined analysis.
        const guidanceResult = getGuidance(result);

        // Save scan metadata, not the submitted URL.
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
        console.error("URL analysis error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to analyse the URL right now."
        });
    }
}

// ============================================
// GET USER SCAN HISTORY CONTROLLER
// ============================================

async function getScanHistoryController(req, res) {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT id, scan_type, risk_score, risk_level,
                    indicators, analysis_status, created_at
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

// ============================================
// EXPORT CONTROLLERS
// ============================================

module.exports = {
    analyseMessageController,
    analyseURLController,
    getScanHistoryController
};
