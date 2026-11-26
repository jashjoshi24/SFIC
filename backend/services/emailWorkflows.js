const {OPTIONAL} = require('./emailTemplates');

function createWorkflows({pool, service, logger = console}) {
  async function queueAdminComplaint(complaintId, db = pool) {
    await db.query(`INSERT INTO email_outbox(dedupe_key,type,admin_id,data)
      SELECT 'new-complaint:' || $1::text || ':' || id, 'admin_new_complaint', id,
        jsonb_build_object('complaintId', $1::text)
      FROM admin_users WHERE is_active = TRUE ON CONFLICT(dedupe_key) DO NOTHING`, [complaintId]);
  }
  async function schedule() {
    // A Pending status is the only existing signal of a draft needing attention.
    await pool.query(`INSERT INTO email_outbox(dedupe_key,type,user_id,data)
      SELECT 'reminder:' || cd.id, 'draft_reminder', u.id, jsonb_build_object('complaintId', cd.id)
      FROM complaint_drafts cd JOIN users u ON u.id=cd.user_id
      WHERE cd.status='Pending' AND cd.created_at <= NOW() - INTERVAL '3 days'
        AND u.is_active=TRUE AND u.draft_reminders=TRUE
      ON CONFLICT(dedupe_key) DO NOTHING`);
    await pool.query(`INSERT INTO email_outbox(dedupe_key,type,admin_id,data)
      SELECT 'digest:' || (NOW() AT TIME ZONE 'Asia/Kolkata')::date || ':' || a.id,
        'admin_pending_digest', a.id,
        jsonb_build_object('pendingCount',(SELECT COUNT(*) FROM complaint_drafts WHERE status='Pending'),
          'reviewCount',(SELECT COUNT(*) FROM complaint_drafts WHERE status='Under Review'))
      FROM admin_users a WHERE a.is_active=TRUE
        AND (NOW() AT TIME ZONE 'Asia/Kolkata')::time >= TIME '09:00'
        AND EXISTS (SELECT 1 FROM complaint_drafts WHERE status IN ('Pending','Under Review'))
      ON CONFLICT(dedupe_key) DO NOTHING`);
  }
  async function deliver(limit = 50, {campaignId, deadline = Infinity} = {}) {
    const config = service.configuration();
    if (!config.enabled || config.missing.length) return {disabled:true, processed:0};
    const campaignFilter = campaignId ? 'AND dedupe_key LIKE $1' : '';
    const params = campaignId ? [`campaign:${campaignId}:%`] : [];
    let processed = 0;
    while (processed < limit && Date.now() < deadline) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const found = await client.query(`SELECT * FROM email_outbox WHERE status='pending'
          AND available_at <= NOW() ${campaignFilter} ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`, params);
        const job = found.rows[0];
        if (!job) { await client.query('COMMIT'); break; }
        const recipient = job.user_id
          ? await client.query('SELECT name,email,is_active,email_notifications,draft_reminders,scam_alerts,cybersecurity_newsletter FROM users WHERE id=$1', [job.user_id])
          : await client.query('SELECT name,email,is_active FROM admin_users WHERE id=$1', [job.admin_id]);
        const user = recipient.rows[0], pref = OPTIONAL[job.type];
        let skip = !user?.is_active || (pref && user[pref] !== true);
        if (job.type === 'draft_reminder') {
          const draft = await client.query("SELECT id FROM complaint_drafts WHERE id=$1 AND user_id=$2 AND status='Pending'", [job.data.complaintId, job.user_id]);
          skip ||= !draft.rows.length;
        }
        // Expired digests should never produce a backlog of daily messages.
        if (job.type === 'admin_pending_digest') skip ||= Date.now() - new Date(job.created_at).getTime() > 24*60*60*1000;
        const result = skip ? {status:'skipped'} : await service.send(job.type, user, job.data);
        if (['disabled','not_configured'].includes(result.status)) { await client.query('ROLLBACK'); break; }
        const terminal = result.status === 'accepted' ? 'accepted'
          : ['skipped','invalid_recipient'].includes(result.status) ? 'skipped'
          : job.attempts >= 2 ? 'failed' : 'pending';
        await client.query(`UPDATE email_outbox SET status=$2, attempts=attempts+1,
          available_at=NOW() + INTERVAL '15 minutes' * (attempts+1) WHERE id=$1`, [job.id, terminal]);
        await client.query('COMMIT'); processed++;
      } catch (error) {
        await client.query('ROLLBACK'); logger.warn('Email workflow delivery failed.'); throw error;
      } finally { client.release(); }
    }
    return {processed};
  }
  return {queueAdminComplaint, schedule, deliver};
}
function workflows() {
  return createWorkflows({pool:require('../config/db'), service:require('./emailService').emailService});
}
module.exports = {createWorkflows, workflows};
