
const { analyseURLHybrid } = require("../services/urlAnalysisService");
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

        // Existing message analysis.
        const result = analyseMessage(message);

        const guidanceResult = getGuidance(result);

        // Save scan metadata, not the original message.
        const dbResult = await pool.query(
            `INSERT INTO scan_history
             (scan_type, risk_score, risk_level, indicators, analysis_status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, created_at`,
            [
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
            // Run existing heuristics + both Google threat lookups.
            result = await analyseURLHybrid(url);
        } catch (error) {
            // Invalid URL errors are client errors.
            if (
                error.message.includes("URL") ||
                error.message.includes("HTTP") ||
                error.message.includes("character") ||
                error.message.includes("hostname")
            ) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            throw error;
        }

        // Generate guidance using the combined result.
        const guidanceResult = getGuidance(result);

        // Save scan metadata, not the submitted URL or API keys.
        const dbResult = await pool.query(
            `INSERT INTO scan_history
             (scan_type, risk_score, risk_level, indicators, analysis_status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, created_at`,
            [
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

module.exports = {
    analyseMessageController,
    analyseURLController
};