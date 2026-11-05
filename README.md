# Surakshit Gujarat — V18 Connected Frontend

This package connects the supplied V18 Stitch page exports into one navigable static frontend while retaining each original page's HTML, Tailwind classes, inline CSS, typography, colours, and layout.

## Routes
- `/` — Public landing page
- `/app` — User dashboard (V18 `user_dashboard_1`)
- `/emergency` — Emergency help and complaint hub
- `/app/check/url` — Phishing / URL checker
- `/app/check/message` — Message scam checker
- `/app/check/image` — QR / screenshot analyzer
- `/app/assistant` — Gujarati AI assistant
- `/awareness` — Scam awareness library
- `/awareness/article` — Scam guide / family sharing
- `/app/profile` — User profile and settings
- `/login` — Login and onboarding
- `/admin` — Admin dashboard

## Run
Requires Node.js 18+.

```bash
npm install
npm run dev
```
Open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## Design preservation
The original V18 HTML pages are served as individual route documents rather than rebuilt into a new component theme. The global navigation patch only maps existing `data-path` navigation targets to the canonical routes. Original screenshots are retained under `references/v18/`.

## Notes
- The two dashboard variants are retained in the source ZIP; `user_dashboard_1` is used as the canonical `/app` page.
- The canonical emergency page is `emergency_help_complaint_hub`.
- Backend-dependent functions remain prototype-only unless connected to a real backend. Review existing page-level demo interactions before production deployment.
- Original Stitch images are externally hosted in the supplied HTML where applicable; internet access may be needed to display them.


## Voice message transcription (Faster-Whisper)

The message checker supports both audio-file upload and microphone recording. The browser sends audio to the existing Express API (`/api/transcription/transcribe`), which forwards it to a separate Python Faster-Whisper service. The transcript is inserted into the existing message text box; the user reviews it and explicitly starts the existing scam analysis.

### Run locally

1. Start the Python service in one terminal:

   ```powershell
   cd whisper-service
   py -3.11 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   $env:WHISPER_MODEL_DIR="$PWD\model-cache"
   uvicorn main:app --reload --port 8000
   ```

2. Start the existing Express backend in another terminal:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

3. Start the frontend from the repository root in a third terminal:

   ```bash
   npm install
   npm run dev
   ```

The first Whisper startup downloads the selected model (`small` by default). Set `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`, and `WHISPER_MODEL_DIR` on the Python host as needed. Set `WHISPER_SERVICE_URL` on the Node backend if the Python service is not at `http://127.0.0.1:8000`.

For production, deploy the Python service separately, set the Node backend's `WHISPER_SERVICE_URL` to its private/internal URL, and persist the model-cache volume. Use HTTPS for microphone access. Never commit model weights, audio uploads, or secrets.
