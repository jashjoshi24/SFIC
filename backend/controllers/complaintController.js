
const pool = require("../config/db");
const {workflows} = require('../services/emailWorkflows');
const { notifyCitizen } = require("../services/emailService");

// ============================================
// GENERATE AND SAVE COMPLAINT
// ============================================

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
        } = req.body || {};

        // Validate incident description.
        if (
            typeof incidentDescription !== "string" ||
            !incidentDescription.trim() ||
            incidentDescription.length > 5000
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid incident description."
            });
        }

        // Validate complaint draft.
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

        // Validate optional incident date.
        let parsedDate = null;

        if (incidentDate !== undefined && incidentDate !== null && incidentDate !== "") {
            parsedDate = new Date(incidentDate);

            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid incident date."
                });
            }
        }

        // Validate optional amount.
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

        // Validate optional transaction ID.
        if (
            transactionId !== undefined &&
            transactionId !== null &&
            typeof transactionId !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction ID."
            });
        }

        if (transactionId && transactionId.length > 255) {
            return res.status(400).json({
                success: false,
                message: "Transaction ID is too long."
            });
        }

        // Validate optional platform.
        if (
            platform !== undefined &&
            platform !== null &&
            typeof platform !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid platform."
            });
        }

        if (platform && platform.length > 255) {
            return res.status(400).json({
                success: false,
                message: "Platform name is too long."
            });
        }

        // Validate optional suspect details.
        if (
            suspectDetails !== undefined &&
            suspectDetails !== null &&
            typeof suspectDetails !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid suspect details."
            });
        }

        if (suspectDetails && suspectDetails.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Suspect details are too long."
            });
        }

        // Validate optional scan ID and verify ownership.
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
                `SELECT id
                 FROM scan_history
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

        // Save complaint and associated incident details.
        const client = await pool.connect();
        let result;
        try {
        await client.query("BEGIN");
        result = await client.query(
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
                incidentDescription.trim(),
                complaintText.trim(),
                parsedDate,
                parsedAmount,
                transactionId?.trim() || null,
                platform?.trim() || null,
                suspectDetails?.trim() || null
            ]
        );

        await workflows().queueAdminComplaint(result.rows[0].id, client);
        await client.query("COMMIT");
        } catch (error) { await client.query("ROLLBACK"); throw error; }
        finally { client.release(); }

        await notifyCitizen(req.user.userId, "complaint_saved", {complaintId: result.rows[0].id});

        return res.status(201).json({
            success: true,
            complaintId: result.rows[0].id,
            createdAt: result.rows[0].created_at,
            complaintText: complaintText.trim(),
            savedDetails: {
                incidentDescription: incidentDescription.trim(),
                incidentDate: parsedDate,
                amount: parsedAmount,
                transactionId: transactionId?.trim() || null,
                platform: platform?.trim() || null,
                suspectDetails: suspectDetails?.trim() || null,
                scanId: parsedScanId
            }
        });

    } catch (error) {
        console.error("Complaint generation error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to save complaint draft."
        });
    }
}

// ============================================
// GET USER COMPLAINT HISTORY
// ============================================

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
        console.error("Complaint history error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaint history."
        });
    }
}

// ============================================
// EXPORT CONTROLLERS
// ============================================

module.exports = {
    generateComplaint,
    getComplaintHistory
};
