# Admin workspace

Open `/admin/index.html` for the overview. All pages use the existing administrator session and configured API base.

- `/admin/scans.html`: filter and paginate safety checks, inspect risk indicators, export the current page, and open related complaints.
- `/admin/complaints.html`: search/filter drafts, review details and status history, edit status and notes. `?status=Pending` filters the queue; `?id=7` opens a specific draft. Status changes use the existing citizen notification behavior.
- `/admin/citizens.html`: paginated, searchable account directory with per-account scan and draft counts. Credentials are excluded.
- `/admin/reports.html`: 7/30/90-day daily activity, scan types and risk distribution. Calendar days use Asia/Kolkata and include zero-activity days.
- `/admin/awareness.html`: create, edit, delete and restore citizen guides in English, Gujarati or Hindi. English is required; missing translations use English. Saves publish immediately. Deletes remove guides from the public API while keeping a recoverable record.

Protected API additions:

- `GET /api/admin/citizens?search=&page=1`
- `GET /api/admin/reports?days=30`
- `GET/POST /api/admin/awareness`
- `PUT/DELETE /api/admin/awareness/:id` (requires the last read `version`)
- `POST /api/admin/awareness/:id/restore` (requires `version`)

Citizen library: `GET /api/awareness` returns only published guides. The library and article pages both load this API; they do not fall back to stale bundled content on network errors.

Deploy the backend route/controller additions alongside frontend files when releasing these pages. For awareness content, run `node backend/scripts/setupAwareness.js` once against the target database before deploying. It creates the table and seeds existing guides without overwriting saved edits or deletions.

Validation: `node --test backend/tests/adminWorkspaceController.test.js backend/tests/adminScanController.test.js backend/tests/awarenessController.test.js`, `npm run build`, and browser checks for navigation, search, reports, translations, scan/complaint details and mobile layout.
