const pool = require('../config/db');
const {renderEmail, OPTIONAL, CAMPAIGN_TYPES} = require('../services/emailTemplates');

const preferenceKeys = {draftReminders:'draft_reminders', scamAlerts:'scam_alerts', cybersecurityNewsletter:'cybersecurity_newsletter'};
async function preferences(req,res) {
  try {
    const body = req.body || {};
    if (req.method === 'PATCH') {
      if (!Object.keys(body).length || Object.entries(body).some(([k,v]) => !Object.hasOwn(preferenceKeys,k) || typeof v !== 'boolean')) return res.status(400).json({success:false,message:'Choose valid email preferences.'});
      const entries = Object.entries(body);
      await pool.query(`UPDATE users SET ${entries.map(([k],i)=>`${preferenceKeys[k]}=$${i+2}`).join(',')} WHERE id=$1`, [req.user.userId, ...entries.map(([,v])=>v)]);
    }
    const result = await pool.query('SELECT draft_reminders,scam_alerts,cybersecurity_newsletter FROM users WHERE id=$1', [req.user.userId]);
    return res.json({success:true, preferences:result.rows[0]});
  } catch { return res.status(500).json({success:false,message:'Unable to load or save email preferences.'}); }
}
async function createSupport(req,res) {
  const {subject,message} = req.body || {};
  if (typeof subject !== 'string' || !subject.trim() || subject.length>160 || typeof message !== 'string' || !message.trim() || message.length>5000) return res.status(400).json({success:false,message:'Enter a subject (up to 160 characters) and message (up to 5,000 characters).'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const saved = await client.query('INSERT INTO support_requests(user_id,subject,message) VALUES($1,$2,$3) RETURNING id', [req.user.userId,subject.trim(),message.trim()]);
    const id = saved.rows[0].id;
    await client.query(`INSERT INTO email_outbox(dedupe_key,type,user_id,data) VALUES($1,'support_acknowledgement',$2,$3)`, [`support:${id}`,req.user.userId,JSON.stringify({ticketId:id})]);
    await client.query('COMMIT'); return res.status(201).json({success:true,ticketId:id});
  } catch { await client.query('ROLLBACK'); return res.status(500).json({success:false,message:'Unable to save your support request.'}); }
  finally { client.release(); }
}
async function supportHistory(req,res) {
  try {const result=await pool.query('SELECT id,subject,status,created_at FROM support_requests WHERE user_id=$1 ORDER BY id DESC LIMIT 100',[req.user.userId]); return res.json({success:true,requests:result.rows});}
  catch {return res.status(500).json({success:false,message:'Unable to load support requests.'});}
}
function campaignData(body) {
  const {type,title,summary,tips} = body || {};
  const minimumTips = type === 'account_announcement' ? 0 : 1;
  if (!CAMPAIGN_TYPES.includes(type) || typeof title !== 'string' || !title.trim() || title.length>100 || /[\r\n]/.test(title) || typeof summary !== 'string' || !summary.trim() || summary.length>1200 || !Array.isArray(tips) || tips.length<minimumTips || tips.length>5 || tips.some(t=>typeof t!=='string'||!t.trim()||t.length>300)) throw new Error('Choose an email type and enter a title (100 characters) and introduction (1,200 characters). Include up to 5 tips (300 characters each). Alerts and newsletters require at least one tip.');
  return {type,data:{title:title.trim(),summary:summary.trim(),tips:tips.map(t=>t.trim())}};
}
function preview(req,res) {
  try {const {type,data}=campaignData(req.body);return res.json({success:true,...renderEmail(type,data)});}
  catch(e) {return res.status(400).json({success:false,message:e.message});}
}
function deliveryConfigured() {
  const {enabled, missing} = require('../services/emailService').emailService.configuration();
  return enabled && missing.length === 0;
}
async function queueCampaign(req,res) {
  let campaign; try {campaign=campaignData(req.body);} catch(e) {return res.status(400).json({success:false,message:e.message});}
  const requestKey=req.body.requestKey;
  if (typeof requestKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey)) return res.status(400).json({success:false,message:'A unique campaign request key is required.'});
  if (req.body.sendNow === true && !deliveryConfigured()) return res.status(503).json({success:false,message:'Email delivery is unavailable. Check the Brevo settings.'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const saved=await client.query('INSERT INTO email_campaigns(type,data,admin_id,request_key) VALUES($1,$2,$3,$4) ON CONFLICT(admin_id,request_key) DO NOTHING RETURNING id',[campaign.type,JSON.stringify(campaign.data),req.admin.id,requestKey]);
    if (!saved.rows.length) {
      const existing=await client.query("SELECT c.id,(SELECT COUNT(*)::int FROM email_outbox WHERE dedupe_key LIKE 'campaign:' || c.id || ':%') AS queued FROM email_campaigns c WHERE c.admin_id=$1 AND c.request_key=$2",[req.admin.id,requestKey]);
      await client.query('COMMIT');return res.json({success:true,campaignId:existing.rows[0].id,queued:existing.rows[0].queued});
    }
    const id=saved.rows[0].id, pref=OPTIONAL[campaign.type];
    const consentFilter = pref ? `AND ${pref}=TRUE` : '';
    const queued=await client.query(`INSERT INTO email_outbox(dedupe_key,type,user_id,data)
      SELECT 'campaign:' || $1::text || ':' || id, $2, id, $3::jsonb FROM users
      WHERE is_active=TRUE ${consentFilter} RETURNING id`,[id,campaign.type,JSON.stringify(campaign.data)]);
    await client.query('COMMIT');return res.status(201).json({success:true,campaignId:id,queued:queued.rowCount});
  } catch {await client.query('ROLLBACK');return res.status(500).json({success:false,message:'Unable to queue the campaign.'});}
  finally {client.release();}
}
async function sendCampaign(req, res) {
  const id = req.params.id;
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
    return res.status(400).json({success:false, message:'Invalid campaign ID.'});
  }
  if (!deliveryConfigured()) return res.status(503).json({success:false, message:'Email delivery is unavailable. Check the Brevo settings.'});
  try {
    const campaign = await pool.query('SELECT id FROM email_campaigns WHERE id=$1 AND admin_id=$2', [id, req.admin.id]);
    if (!campaign.rows.length) return res.status(404).json({success:false, message:'Campaign not found.'});
    const {workflows} = require('../services/emailWorkflows');
    const result = await workflows().deliver(20, {campaignId:id, deadline:Date.now() + 5000});
    const {rows:[delivery]} = await pool.query(`SELECT
      COUNT(*) FILTER (WHERE status='accepted')::int AS accepted,
      COUNT(*) FILTER (WHERE status='skipped')::int AS skipped,
      COUNT(*) FILTER (WHERE status='failed')::int AS failed,
      COUNT(*) FILTER (WHERE status='pending')::int AS pending,
      COUNT(*) FILTER (WHERE status='pending' AND available_at <= NOW())::int AS ready
      FROM email_outbox WHERE dedupe_key LIKE $1`, [`campaign:${id}:%`]);
    return res.json({success:true, ...delivery, processed:result.processed});
  } catch {
    return res.status(500).json({success:false, message:'Unable to continue sending this edition. Retry to resume the same campaign.'});
  }
}
async function overview(req,res) {
  try {
    const counts=await pool.query('SELECT type,status,COUNT(*)::int AS count FROM email_outbox GROUP BY type,status ORDER BY type,status');
    const support=await pool.query('SELECT id,subject,message,status,created_at FROM support_requests ORDER BY id DESC LIMIT 50');
    const audiences = await pool.query(`SELECT COUNT(*)::int AS account_announcement,
      COUNT(*) FILTER (WHERE scam_alerts)::int AS scam_alert,
      COUNT(*) FILTER (WHERE cybersecurity_newsletter)::int AS cybersecurity_newsletter
      FROM users WHERE is_active=TRUE`);
    const pendingCampaigns = await pool.query(`SELECT c.id, c.data->>'title' AS title,
      COUNT(*)::int AS pending,
      COUNT(*) FILTER (WHERE o.available_at <= NOW())::int AS ready
      FROM email_campaigns c JOIN email_outbox o ON o.dedupe_key LIKE 'campaign:' || c.id || ':%'
      WHERE c.admin_id=$1 AND o.status='pending' GROUP BY c.id ORDER BY c.id DESC LIMIT 20`, [req.admin.id]);
    return res.json({success:true,delivery:counts.rows,support:support.rows,audiences:audiences.rows[0],
      immediateDelivery:deliveryConfigured(),pendingCampaigns:pendingCampaigns.rows});
  } catch {return res.status(500).json({success:false,message:'Unable to load the email workspace. Check the email migration.'});}
}
async function closeSupport(req,res) {
  if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({success:false,message:'Invalid request ID.'});
  try {const r=await pool.query("UPDATE support_requests SET status='Closed' WHERE id=$1 RETURNING id",[req.params.id]);return res.status(r.rows.length?200:404).json({success:Boolean(r.rows.length)});}
  catch {return res.status(500).json({success:false,message:'Unable to close request.'});}
}
module.exports={preferences,createSupport,supportHistory,preview,queueCampaign,sendCampaign,overview,closeSupport,campaignData};
