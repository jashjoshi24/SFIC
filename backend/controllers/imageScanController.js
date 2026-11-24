
const { analyseImage } = require("../services/imageAnalysisService");
const pool = require("../config/db");
const { getGuidance } = require("../services/guidanceService");

async function analyseImageController(req, res) {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image."
            });
        }

        const result = await analyseImage(req.file.buffer);

        // Generate guidance using the combined analysis.
        const guidanceResult = getGuidance(result);

        // Store scan metadata only. Do not store image or OCR content.
        const dbResult = await pool.query(
            `INSERT INTO scan_history
             (scan_type, risk_score, risk_level, indicators, analysis_status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, created_at`,
            [
                "image",
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
        console.error("Image analysis error:", error.message);

        const clientError = [
            "Image data is empty.",
            "Image exceeds the 15 MB limit.",
            "Only PNG, JPG and WebP images are supported.",
            "Image dimensions are too large."
        ].includes(error.message);

        return res.status(clientError ? 400 : 500).json({
            success: false,
            message: clientError
                ? error.message
                : "Unable to analyse this image right now."
        });
    }
}

module.exports = {
    analyseImageController
};
