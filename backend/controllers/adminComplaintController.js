const pool = require("../config/db");

async function getComplaintDrafts(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;
        const search = (req.query.search || "").trim();
        const status = (req.query.status || "").trim();

        const conditions = [];
        const values = [];

        if (search) {
            values.push(`%${search}%`);
            conditions.push(`(
                cd.incident_description ILIKE $${values.length}
                OR cd.transaction_id ILIKE $${values.length}
                OR cd.platform ILIKE $${values.length}
                OR CAST(cd.id AS TEXT) ILIKE $${values.length}
            )`);
        }

        if (status) {
            values.push(status);
            conditions.push(`cd.status = $${values.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM complaint_drafts cd ${whereClause}`,
            values
        );

        values.push(limit, offset);

        const draftsResult = await pool.query(
            `SELECT
                cd.id,
                cd.scan_id,
                cd.incident_description,
                cd.complaint_text,
                cd.incident_date,
                cd.amount,
                cd.transaction_id,
                cd.platform,
                cd.suspect_details,
                cd.status,
                cd.admin_notes,
                cd.created_at,
                cd.updated_at,
                sh.scan_type,
                sh.risk_score,
                sh.risk_level
             FROM complaint_drafts cd
             LEFT JOIN scan_history sh ON cd.scan_id = sh.id
             ${whereClause}
             ORDER BY cd.created_at DESC
             LIMIT $${values.length - 1}
             OFFSET $${values.length}`,
            values
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
            complaint_drafts: draftsResult.rows
        });

    } catch (error) {
        console.error("Complaint drafts error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaint drafts."
        });
    }
}

async function getComplaintById(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint ID."
            });
        }

        const result = await pool.query(
            `SELECT cd.*, sh.scan_type, sh.risk_score, sh.risk_level
             FROM complaint_drafts cd
             LEFT JOIN scan_history sh ON cd.scan_id = sh.id
             WHERE cd.id = $1`,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found."
            });
        }

        return res.json({
            success: true,
            complaint: result.rows[0]
        });

    } catch (error) {
        console.error("Complaint detail error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaint."
        });
    }
}

async function updateComplaintStatus(req, res) {
    try {
        const id = Number(req.params.id);
        const { status, adminNotes } = req.body;

        const allowedStatuses = [
            "Pending",
            "Under Review",
            "Resolved",
            "Rejected"
        ];

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint ID."
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint status."
            });
        }

        if (adminNotes !== undefined &&
            (typeof adminNotes !== "string" || adminNotes.length > 2000)) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin notes."
            });
        }

        const client = await pool.connect();

let updatedComplaint;

try {
    await client.query("BEGIN");

    const existing = await client.query(
        `SELECT status FROM complaint_drafts
         WHERE id = $1 FOR UPDATE`,
        [id]
    );

    if (!existing.rows.length) {
        await client.query("ROLLBACK");

        return res.status(404).json({
            success: false,
            message: "Complaint not found."
        });
    }

    const previousStatus = existing.rows[0].status;

    const result = await client.query(
        `UPDATE complaint_drafts
         SET status = $1,
             admin_notes = COALESCE($2, admin_notes),
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, status, admin_notes, updated_at`,
        [status, adminNotes ?? null, id]
    );

    updatedComplaint = result.rows[0];

    if (previousStatus !== status) {
        await client.query(
            `INSERT INTO complaint_status_history
 (complaint_id, previous_status, new_status, admin_notes, admin_id)
 VALUES ($1, $2, $3, $4, $5)`,
[id, previousStatus, status, adminNotes ?? null, req.admin.id]
        );
    }

    await client.query("COMMIT");

} catch (error) {
    await client.query("ROLLBACK");
    throw error;
} finally {
    client.release();
}

return res.json({
    success: true,
    complaint: updatedComplaint
});

    } catch (error) {
        console.error("Complaint update error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update complaint."
        });
    }
}

async function getComplaintHistory(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint ID."
            });
        }

        const result = await pool.query(
            `SELECT
                h.id,
                h.previous_status,
                h.new_status,
                h.admin_notes,
                h.admin_id,
                a.name AS admin_name,
                a.email AS admin_email,
                h.changed_at
             FROM complaint_status_history h
             LEFT JOIN admin_users a ON h.admin_id = a.id
             WHERE h.complaint_id = $1
             ORDER BY h.changed_at DESC`,
            [id]
        );

        return res.json({
            success: true,
            history: result.rows
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
    getComplaintDrafts,
    getComplaintById,
    updateComplaintStatus,
    getComplaintHistory
};