const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {renderEmail, createEmailService} = require('../services/emailService');

const env = {EMAIL_ENABLED: 'true', BREVO_API_KEY: 'test-only-key', EMAIL_FROM_ADDRESS: 'sender@example.com', EMAIL_APP_URL: 'https://safety.example.com'};
const user = {name: '<img src=x onerror=alert(1)>', email: 'citizen@example.com'};

test('Emails escape account names and link to the configured application', () => {
    const message = renderEmail('welcome', user, env);
    assert.ok(message.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(!message.html.includes('<img src=x'));
    assert.ok(message.html.includes('https://safety.example.com/app/index.html'));
    assert.ok(message.text.includes('તમારું સ્વાગત'));
});

test('Complaint notifications contain references but omit submitted incident data', () => {
    const message = renderEmail('complaint_saved', {complaintId: 42, incidentDescription: 'private-incident', transactionId: 'private-transaction'}, env);
    assert.match(message.subject, /#42/);
    assert.ok(!message.text.includes('private-incident'));
    assert.ok(!message.html.includes('private-transaction'));
    assert.match(message.text, /does not submit a police complaint/);
    assert.throws(() => renderEmail('complaint_status', {complaintId: 42, status: '<script>'}, env));
    assert.throws(() => renderEmail('welcome', {}, {...env, EMAIL_APP_URL: 'javascript:alert(1)'}));
});

test('Disabled, incomplete, and reserved test recipients never contact Brevo', async () => {
    const fetchImpl = () => { throw new Error('Must not be called'); };
    assert.equal((await createEmailService({env: {...env, EMAIL_ENABLED: 'false'}, fetchImpl}).send('welcome', user)).status, 'disabled');
    assert.equal((await createEmailService({env: {...env, BREVO_API_KEY: ''}, fetchImpl}).send('welcome', user)).status, 'not_configured');
    assert.equal((await createEmailService({env, fetchImpl}).send('welcome', {...user, email: 'test@example.invalid'})).status, 'invalid_recipient');
});

test('Brevo receives the authenticated request with HTML and plain text', async () => {
    let payload;
    const service = createEmailService({env, fetchImpl: async (url, options) => {
        assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
        assert.equal(options.headers['api-key'], 'test-only-key');
        payload = JSON.parse(options.body);
        return {ok: true, json: async () => ({messageId: 'provider-message-id'})};
    }});
    assert.equal((await service.send('complaint_status', user, {complaintId: 7, status: 'Under Review'})).status, 'accepted');
    assert.deepEqual(payload.to, [{name: user.name, email: user.email}]);
    assert.ok(payload.htmlContent && payload.textContent);
    assert.ok(!JSON.stringify(payload).includes('test-only-key'));
});

test('Provider rejection and timeouts are contained without logging secrets', async () => {
    for (const fetchImpl of [async () => ({ok: false, json: async () => ({message: 'private provider response'})}), async () => { throw new Error('private provider response'); }]) {
        const logs = [];
        const service = createEmailService({env, fetchImpl, logger: {warn: value => logs.push(value)}});
        assert.equal((await service.send('welcome', user)).status, 'failed');
        assert.equal(logs.length, 1);
        assert.ok(!logs[0].includes('private provider response'));
        assert.ok(!logs[0].includes(env.BREVO_API_KEY));
    }
});

test('Admin email is sent after commit, only when the status changes, to the draft owner', async () => {
    for (const previousStatus of ['Pending', 'Under Review']) {
        const actions = [], sends = [];
        const client = {
            query: async (sql) => {
                actions.push(sql);
                if (sql.includes('SELECT status')) return {rows: [{status: previousStatus, user_id: 99}]};
                if (sql.includes('UPDATE complaint_drafts')) return {rows: [{id: 7, status: 'Under Review'}]};
                return {rows: []};
            }, release() {},
        };
        const context = vm.createContext({module: {exports: {}}, console, require: name => {
            if (name === '../config/db') return {connect: async () => client};
            if (name === '../services/emailService') return {notifyCitizen: async (...args) => { assert.ok(actions.includes('COMMIT')); sends.push(args); }};
            throw new Error(`Unexpected dependency: ${name}`);
        }});
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../controllers/adminComplaintController.js'), 'utf8'), context);
        const req = {params: {id: '7'}, body: {status: 'Under Review'}, admin: {id: 1}};
        const res = {json(value) { assert.equal(value.success, true); return value; }};
        await context.module.exports.updateComplaintStatus(req, res);
        assert.equal(sends.length, previousStatus === 'Pending' ? 1 : 0);
        if (sends.length) { assert.equal(sends[0][0], 99); assert.equal(sends[0][1], 'complaint_status'); assert.equal(sends[0][2].complaintId, 7); }
    }
});
