# Faster-Whisper integration summary

## What was added
- `whisper-service/`: a standalone Python FastAPI service using Faster-Whisper.
- `backend/routes/transcriptionRoutes.js`: an Express endpoint that securely proxies audio bytes to the Python service.
- `backend/server.js`: registers `/api/transcription` with a dedicated rate limit.
- `public/app/check/message/index.html`: adds audio-file upload and microphone recording to the existing message checker. The transcript is inserted into the existing text box; the user reviews it and chooses Analyse.
- `.gitignore` entries to keep model caches, virtual environments, and audio files out of Git.

## Local run (three terminals)

### Terminal 1 — Python Whisper service
```powershell
cd whisper-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:WHISPER_MODEL_DIR="$PWD\model-cache"
uvicorn main:app --reload --port 8000
```

### Terminal 2 — Existing Node backend
```powershell
cd backend
npm install
$env:WHISPER_SERVICE_URL="http://127.0.0.1:8000"
npm run dev
```

### Terminal 3 — Existing frontend
```powershell
npm install
npm run dev
```

Open `/app/check/message`. Use Upload audio or Record voice. The first Python startup downloads the model (default `small`) into the model cache.

## Deployment
Deploy the Python service separately from the Node service. Set `WHISPER_SERVICE_URL` on Node to the private/internal URL of the Python service. Persist `WHISPER_MODEL_DIR` using a mounted volume so the model does not need to be downloaded after every restart. Set `window.SFIC_API_BASE_URL` before the page's inline script if the frontend and Express backend use different public origins.

Microphone recording requires browser microphone permission and HTTPS in production. The included Dockerfile is CPU-oriented; GPU hosting requires a compatible NVIDIA runtime and CUDA/cuDNN configuration.

## Notes
- No model weights or API keys are committed.
- The Python service accepts audio up to 25 MiB and serializes inference to protect small CPU/GPU instances.
- Whisper automatically detects Gujarati (`gu`), Hindi (`hi`), or English (`en`). Other detected languages are rejected with a clear message. No language selector is included, and speech is transcribed rather than translated.
- The transcript is not automatically analysed. Users can review/edit it before invoking the existing scam-analysis flow.
- Only upload audio recordings that you are authorized to share. Avoid uploading OTPs, PINs, passwords, or other sensitive content.
