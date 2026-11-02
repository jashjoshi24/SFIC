
const { analyseMessage } = require("../services/messageAnalysisService");
const { getGuidance } = require("../services/guidanceService");

async function getMessageGuidance(req, res) {
  try {
    const { message } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 10000
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid message (maximum 10000 characters)."
      });
    }

    const analysis = analyseMessage(message);

    const guidance = getGuidance(analysis);

    return res.status(200).json({
      success: true,
      analysis,
      ...guidance
    });

  } catch (error) {
    console.error("Guidance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate guidance right now."
    });
  }
}

module.exports = { getMessageGuidance };
