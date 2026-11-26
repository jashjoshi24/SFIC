# System emails

The backend sends transactional emails through Brevo's REST API for:

- A newly created citizen account.
- A complaint draft saved to the account.
- An administrator changing a complaint's status. Editing notes without changing status does not send another email.

Each email has a branded HTML version, a plain-text alternative, a Gujarati introduction, and a link to the account. Incident descriptions, financial references, passwords, and administrator notes are excluded from email content. The recipient is the saved account email; clients cannot choose another recipient.

Configure `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, and `EMAIL_APP_URL` in the private backend `.env`, then set `EMAIL_ENABLED=true` and restart the backend. Use an active Brevo sender. `EMAIL_APP_URL` currently points to the local app; replace it with the deployed frontend URL for remote recipients.

Provider acceptance is not confirmation of inbox delivery. Delivery failures are logged without provider response bodies and do not undo successful registration or complaint changes. Failed messages are not queued or automatically retried. `.invalid` test addresses are never sent to Brevo. Set `EMAIL_ENABLED=false` for development tests that use real email addresses.

Run the automated suite with `node --test tests/*.test.js`. Email tests replace the network transport and send no messages. HTML previews can be generated using `node scripts/previewEmails.js`; they are written under the ignored `.local-logs/emails` directory at the project root.

## Extended workflows

All nine email types share a responsive, table-based design: cream paper, charcoal branding, editorial serif headlines, numbered information cards, Gujarati introductions, and a plain-text version. Each workflow has its own headline, accent, and content. No external images, fonts, scripts or tracking pixels are required.

| Workflow | Trigger | Recipient |
| --- | --- | --- |
| Saved draft reminder | Once, after a draft has been Pending for three days | Active citizen who enabled draft reminders |
| Support acknowledgement | A support request is saved | The signed-in citizen's account email |
| New complaint alert | A citizen saves a new draft | All active administrators |
| Pending review digest | First worker run at or after 09:00 IST each day, if review work exists | All active administrators |
| Scam awareness alert | Administrator previews and queues an edition | Active citizens who enabled scam alerts |
| Cybersecurity newsletter | Administrator previews and queues an edition | Active citizens who enabled the newsletter |

The existing data model does not record whether a citizen has finished editing a draft or reported it externally. Reminders therefore mean **still Pending in this application**, not unfinished or unreported. They stop if the application status changes before delivery. Incident descriptions, financial details, support messages, and administrator notes stay out of email content.

### Setup

From `backend`, after the base schema and profile migration are installed:

1. Run `npm run emails:migrate` against the intended database. This adds opt-in preferences, support requests, campaigns, and the durable outbox. Apply before deploying the updated backend.
2. Configure the existing Brevo variables and set `EMAIL_APP_URL` to the public HTTPS frontend origin. No additional mail provider is needed.
3. Deploy frontend and backend together. Citizens use `/support/index.html` for support history and separate subscriptions; the dashboard profile links to it. All optional subscriptions default to **false**, including for existing users. Administrators use `/admin/emails.html` to preview campaigns, queue editions, inspect delivery counts and close support requests.
4. Schedule `npm run emails:work` hourly in your deployment environment, with the same database and Brevo configuration as the backend. For Google Cloud Run, use a scheduled Cloud Run Job. The command exits after scheduling due messages and processing at most 100 messages; increase run frequency to drain larger queues. No scheduler is installed automatically, and the API does not start a background worker.
5. Generate previews using `npm run emails:preview`. Open `.local-logs/emails/index.html` for the full collection. Preview and build commands never send mail.

The worker sends real messages when `EMAIL_ENABLED=true`; do not run it as a visual test. It selects recipients from saved accounts, checks active status and optional consent again at delivery, and skips outdated daily digests. Unsubscribe links open the authenticated preferences page, where users can turn off each subscription or all three. Transactional support acknowledgements are independent of these subscriptions; existing complaint notification preferences continue to work.

### Delivery and retries

New administrator alerts and support acknowledgements are queued in the same database transaction as their source record. Reminder and daily-digest dedupe keys prevent repeated scheduling. Campaign request UUIDs make retries of the same queue operation idempotent. Campaigns are queued explicitly rather than automatically when a guide is published.

Queue workers use PostgreSQL row locks with `SKIP LOCKED`. Failed provider calls retry up to three attempts, with increasing 15-minute delays. Disabled or unconfigured email leaves messages pending. Outbox status `accepted` means Brevo accepted the message; it does not prove inbox delivery. Provider delivery webhooks are not implemented. A process failure after provider acceptance but before the database commit can still produce a duplicate on retry; this is an at-least-once outbox, not exactly-once delivery. The original welcome, saved-draft and status-change messages still send directly and do not use the retry queue.

In Email & support, **Send email now** processes the selected edition immediately in batches. **Service announcement** targets all active accounts. Scam alerts and newsletters use their respective opt-in lists. Pending editions can be resumed from the delivery section. The scheduled worker handles unattended delivery and automatic retries.

Support has an authenticated submission/history endpoint and an admin inbox with a close action. It does not send support replies or promise a response deadline.

### Endpoints

- Citizen: `GET/PATCH /api/auth/email-preferences`; `GET/POST /api/auth/support`.
- Admin: `GET /api/admin/emails`; `POST /api/admin/emails/preview`; `POST /api/admin/emails/campaigns`; `POST /api/admin/emails/campaigns/:id/send`; `PATCH /api/admin/emails/support/:id/close`.
- A campaign body contains `type` (`scam_alert`, `cybersecurity_newsletter`, or `account_announcement`), `title`, `summary`, `tips` (up to five strings), and a version-4 UUID `requestKey` for queueing. Tips are optional for service announcements. The preview endpoint does not require the request key. There is no client-supplied recipient field.

API reference: https://developers.brevo.com/reference/send-transac-email
