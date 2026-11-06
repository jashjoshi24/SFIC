const express = require("express");
const router = express.Router();

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const allowedExtensions = [
  '.wav',
  '.mp3',
  '.m4a',
  '.ogg',
  '.webm',
  '.weba',
  '.flac',
  '.mp4'
];

// The browser sends the audio bytes directly. Express forwards them to the
// private Python service as multipart/form-data; model files never pass here.
router.post(
    "/transcribe",
    express.raw({ type: ["audio/*", "application/octet-stream"], limit: MAX_AUDIO_BYTES }),
    async (req, res) => {
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
            return res.status(400).json({ success: false, message: "Please select or record an audio file." });
        }

        const originalName = String(req.get("x-audio-filename") || "audio.webm");
        const safeName = originalName.split(/[\\/]/).pop().replace(/[^a-zA-Z0-9._-]/g, "_");
        const extension = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")).toLowerCase() : "";
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            return res.status(415).json({ success: false, message: "Unsupported audio format." });
        }

        const serviceUrl = process.env.WHISPER_SERVICE_URL || "http://127.0.0.1:8000";
        const mimeType = req.get("content-type") || "application/octet-stream";

        try {
            const form = new FormData();
            form.append("file", new Blob([req.body], { type: mimeType }), safeName);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 600000);
            let upstream;
            try {
                upstream = await fetch(`${serviceUrl.replace(/\/$/, "")}/transcribe`, {
                    method: "POST",
                    body: form,
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeout);
            }

            const payload = await upstream.json().catch(() => ({}));
            if (!upstream.ok) {
                return res.status(upstream.status).json({
                    success: false,
                    message: payload.detail || "Transcription service could not process this audio."
                });
            }

            return res.json(payload);
        } catch (error) {
            console.error("Whisper service request failed:", error.message);
            const unavailable = error.name === "AbortError";
            return res.status(unavailable ? 504 : 503).json({
                success: false,
                message: unavailable
                    ? "Transcription timed out. Try a shorter audio recording."
                    : "Transcription service is unavailable. Please try again later."
            });
        }
    }
);

module.exports = router;
