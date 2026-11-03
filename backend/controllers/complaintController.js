
const pool = require("../config/db");

async function generateComplaint(req, res) {
    try {
        const {
    incidentDescription,
    complaintText,
    incidentDate,
    amount,
    transactionId,
    platform,
    suspectDetails,
    scanId
} = req.body;

        if (
    typeof complaintText !== "string" ||
    !complaintText.trim() ||
    complaintText.length > 10000
) {
    return res.status(400).json({
        success: false,
        message: "Please provide a valid complaint draft."
    });
}

        let parsedDate = null;

        if (incidentDate) {
            parsedDate = new Date(incidentDate);

            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid incident date."
                });
            }
        }

        let parsedAmount = null;

        if (amount !== undefined && amount !== null && amount !== "") {
            parsedAmount = Number(amount);

            if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid incident amount."
                });
            }
        }

        let parsedScanId = null;

        if (scanId !== undefined && scanId !== null && scanId !== "") {
            parsedScanId = Number(scanId);

            if (!Number.isSafeInteger(parsedScanId) || parsedScanId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid scan ID."
                });
            }

            const scanCheck = await pool.query(
                `SELECT id FROM scan_history
                 WHERE id = $1 AND user_id = $2`,
                [parsedScanId, req.user.userId]
            );

            if (scanCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot attach a scan that does not belong to you."
                });
            }
        }

        const description = incidentDescription.trim();

        const result = await pool.query(
    `INSERT INTO complaint_drafts (
        user_id,
        scan_id,
        incident_description,
        complaint_text,
        incident_date,
        amount,
        transaction_id,
        platform,
        suspect_details
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, created_at`,
    [
        req.user.userId,
        parsedScanId,
        description,
        complaintText.trim(),
        parsedDate,
        parsedAmount,
        transactionId || null,
        platform || null,
        suspectDetails || null
    ]
);

        return res.status(201).json({
            success: true,
            complaintId: result.rows[0].id,
            createdAt: result.rows[0].created_at,
            complaintText: complaintText.trim(),
            savedDetails: {
                incidentDate: parsedDate,
                amount: parsedAmount,
                transactionId: transactionId || null,
                platform: platform || null,
                suspectDetails: suspectDetails || null
            }
        });

    } catch (error) {
        console.error("Complaint generation error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to save complaint draft."
        });
    }
}

async function getComplaintHistory(req, res) {
    try {
        const result = await pool.query(
            `SELECT
                id,
                scan_id,
                incident_description,
                complaint_text,
                incident_date,
                amount,
                transaction_id,
                platform,
                suspect_details,
                status,
                created_at,
                updated_at
             FROM complaint_drafts
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.userId]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            complaints: result.rows
        });

    } catch (error) {
        console.error("Complaint history error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaint history."
        });
    }
}

module.exports = {
    generateComplaint,
    getComplaintHistory
};
