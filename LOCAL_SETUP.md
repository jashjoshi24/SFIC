# Local system

From this directory, run `./start-local.ps1` in PowerShell. Services run in the background; logs and process IDs are in `.local-logs/`.

- Frontend: http://localhost:5173
- Citizen login or registration: http://localhost:5173/login
- Administrator login: http://localhost:5173/admin/login.html
- API: http://localhost:5000
- Database check: http://localhost:5000/api/db-test
- Speech service health: http://localhost:8000/health

Use `localhost` for the frontend to match the configured API CORS origin. Existing administrator accounts were preserved. To create an administrator, run `node scripts/createAdmin.js` from `backend` in an interactive terminal.

## Dependencies

Frontend and backend dependencies were installed from their lockfiles with `npm ci`. Speech uses Python 3.13 and `whisper-service/.venv`, with access to the computer's existing Python packages. Missing Uvicorn extras were installed into that environment. PyAV is constrained in `requirements.txt` for compatibility with Faster-Whisper.

For a fresh independent speech environment, create a virtual environment and install `whisper-service/requirements.txt`. The launcher uses a cached Faster-Whisper small model if available, otherwise it downloads the small model into `whisper-service/model-cache`. Inference runs on the CPU using int8.

The existing backend `.env` supplies database and Google API credentials. Missing citizen and administrator JWT secrets were generated locally. Keep this file private.

## Fixes made during setup

- Removed duplicate declarations and route registrations that prevented API startup.
- Removed an extra closing SQL statement from the schema file. The configured database already contained all six application tables, so no schema migration was needed.
- Removed a duplicate package dependency.
- Added early frontend API configuration so local pages use the local backend.
- Added complaint pages to Vite's clean-route handling.
- Added the citizen authorization header to the assistant's guidance request.

## Verification

The frontend production build and 87 backend tests pass. All 15 page routes respond, and 45 inline frontend scripts parse successfully. Live API checks covered registration, login, profile, message and URL scans, scan history, guidance, complaint creation and history, authorization failures, and administrator read APIs. Administrator read checks used a short-lived internal token; existing administrator passwords were not tested or changed. Temporary test accounts, scans, and complaints were removed.

An image containing test text was successfully read by OCR and classified. Both Google Safe Browsing and Web Risk returned successful responses. Gemini's optional brand analysis returned HTTP 503 high-demand responses twice; the application retains OCR and URL results when that upstream service is unavailable.

Speech transcription also passed end to end: a generated English test recording went through Express to the Python service and returned the expected transcript with HTTP 200. The frontend, database check, and speech health endpoints all returned HTTP 200 at the final check. Python dependency verification found no broken requirements.

These checks establish local startup and API operation. They are not a comprehensive security review or manual verification of every UI interaction.

## Removal of simulated interfaces

The interface no longer loads the mock engine or shows placeholder identities, preloaded sample messages, fabricated administrator totals and incident records, or invented district charts and alert feeds. Unconnected header search and notification controls were removed. The translation catalog was consolidated and obsolete interface strings were removed.

The profile page loads the signed-in account, scan history, and complaint history. Reading preferences are saved to browser storage. The complaint generator saves drafts to the account through the backend, including the entered incident description. Image scans require authentication and are linked to the citizen's history. Rule-based analysis reports `rule_based` rather than `demo`.

Browser verification covered sign-in, account identity, image scan history, preferences, language switching, complaint saving, and the saved draft appearing in account history. Temporary test records were removed. Existing user data was preserved. The build and all 87 backend tests pass, and all 15 frontend routes respond. Official reporting notices remain because saving a draft does not submit a police complaint.
