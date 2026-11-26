const {renderEmail} = require('./emailTemplates');

function createEmailService({env = process.env, fetchImpl = global.fetch, logger = console} = {}) {
    function configuration() {
        return {enabled: env.EMAIL_ENABLED === 'true', missing: ['BREVO_API_KEY', 'EMAIL_FROM_ADDRESS'].filter(key => !env[key]?.trim())};
    }
    async function send(type, user, data = {}) {
        const config = configuration();
        if (!config.enabled) return {status: 'disabled'};
        if (config.missing.length) return {status: 'not_configured'};
        const validEmail = value => typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
        if (!validEmail(user?.email) || /\.invalid$/i.test(user.email)) return {status: 'invalid_recipient'};
        try {
            if (!validEmail(env.EMAIL_FROM_ADDRESS)) throw new Error('Invalid sender');
            const message = renderEmail(type, {name: user.name, ...data}, env);
            const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {'api-key': env.BREVO_API_KEY.trim(), 'Content-Type': 'application/json', accept: 'application/json'},
                signal: AbortSignal.timeout(10000),
                body: JSON.stringify({
                    sender: {name: env.EMAIL_FROM_NAME || 'Surakshit Gujarat', email: env.EMAIL_FROM_ADDRESS.trim()},
                    to: [{name: user.name || 'Citizen', email: user.email}],
                    subject: message.subject, htmlContent: message.html, textContent: message.text,
                    tags: ['sfic-transactional', type],
                }),
            });
            const result = await response.json();
            if (!response.ok || !result.messageId) throw new Error('Delivery not accepted');
            return {status: 'accepted'};
        } catch {
            // Provider responses can contain private data. Log only the event type.
            logger.warn(`Transactional email delivery failed (${type}).`);
            return {status: 'failed'};
        }
    }
    return {send, configuration};
}

const emailService = createEmailService();
async function notifyCitizen(userId, type, data) {
    const config = emailService.configuration();
    if (!config.enabled || config.missing.length) return {status: 'disabled'};
    try {
        const pool = require('../config/db');
        const result = await pool.query('SELECT name, email, email_notifications FROM users WHERE id = $1 AND is_active = TRUE', [userId]);
        if (!result.rows.length) return {status: 'invalid_recipient'};
        if (type.startsWith('complaint_') && result.rows[0].email_notifications === false) return {status: 'unsubscribed'};
        return await emailService.send(type, result.rows[0], data);
    } catch { console.warn('Transactional email recipient lookup failed.'); return {status: 'failed'}; }
}

module.exports = {renderEmail, createEmailService, emailService, notifyCitizen};
