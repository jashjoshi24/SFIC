
const express = require("express");
const router = express.Router();

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const allowedExtensions = new Set([
    ".wav",
    ".mp3",
    ".m4a",
    ".ogg",
    ".webm",
    ".weba",
    ".flac",
    ".mp4"
]);

// Browser sends audio bytes directly.
// Express forwards them to the private Faster-Whisper service.
router.post(
    "/transcribe",
    express.raw({
        type: ["audio/*", "application/octet-stream"],
        limit: MAX_AUDIO_BYTES
    }),
    async (req, res) => {

        // 1. Validate audio data
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select or record an audio file."
            });
        }

        // 2. Sanitize original filename
        const originalName = String(
            req.get("x-audio-filename") || "audio.webm"
        );

        const safeName = originalName
            .split(/[\\/]/)
            .pop()
            .replace(/[^a-zA-Z0-9._-]/g, "_");

        // 3. Validate extension
        const extension = safeName.includes(".")
            ? safeName.slice(safeName.lastIndexOf(".")).toLowerCase()
            : "";

        if (!allowedExtensions.has(extension)) {
            return res.status(415).json({
                success: false,
                message: "Unsupported audio format."
            });
        }

        // 4. Get Whisper service URL
        const serviceUrl = (
            process.env.WHISPER_SERVICE_URL ||
            "http://127.0.0.1:8000"
        ).replace(/\/+$/, "");

        const mimeType =
            req.get("content-type") || "application/octet-stream";

        // 5. Forward audio to Faster-Whisper
        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 600000);

        try {
            const form = new FormData();

            form.append(
                "file",
                new Blob([req.body], { type: mimeType }),
                safeName
            );

            const upstream = await fetch(
                `${serviceUrl}/transcribe`,
                {
                    method: "POST",
                    body: form,
                    signal: controller.signal
                }
            );

            // 6. Read Whisper response
            const payload = await upstream.json().catch(() => ({}));

            if (!upstream.ok) {
                console.error(
                    "Whisper service error:",
                    upstream.status,
                    payload
                );

                return res.status(upstream.status).json({
                    success: false,
                    message:
                        payload.detail ||
                        payload.message ||
                        "Transcription service could not process this audio."
                });
            }

            // 7. Return transcription result
            return res.json(payload);

        } catch (error) {
            console.error(
                "Whisper service request failed:",
                error
            );

            if (error.name === "AbortError") {
                return res.status(504).json({
                    success: false,
                    message: "Transcription timed out. Try a shorter audio recording."
                });
            }

            return res.status(503).json({
                success: false,
                message: "Transcription service is unavailable. Please try again later."
            });

        } finally {
            clearTimeout(timeout);
        }
    }
);

module.exports = router;
