
const pool = require("../config/db");

async function generateComplaint(req, res) {
  try {
    const {
      incidentDescription,
      scanId
    } = req.body;

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

    const complaintText = incidentDescription.trim();

    const result = await pool.query(
      `INSERT INTO complaint_drafts
       (scan_id, incident_description, complaint_text)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [scanId || null, complaintText, complaintText]
    );

    return res.status(201).json({
      success: true,
      complaintId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      complaintText
    });

  } catch (error) {
    console.error("Complaint generation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate complaint right now."
    });
  }
}

module.exports = { generateComplaint };
