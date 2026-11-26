const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(file, dependencies) {
    const context = vm.createContext({module: {exports: {}}, process: {env: {USER_JWT_SECRET: 'test'}}, Buffer, console,
        require: name => { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; }});
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
    return context.module.exports;
}
function response() { return {code: 200, data: null, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; }}; }
function controller(pool, bcrypt = {}) {
    return load('controllers/profileController.js', {'../config/db': pool, bcryptjs: bcrypt, '../utils/userToken': {createToken: user => `token-v${user.token_version}`}});
}

test('Profile edits are scoped to the signed-in account and persist false email preferences', async () => {
    let parameters;
    const api = controller({query: async (sql, values) => { parameters = values; assert.match(sql, /WHERE id = \$1/); return {rows: [{id: 12, name: 'Citizen', email_notifications: false}]}; }});
    const res = response();
    await api.updateProfile({user: {userId: 12}, body: {name: ' Citizen ', phone: '', district: '', emailNotifications: false}}, res);
    assert.equal(res.code, 200); assert.equal(parameters[0], 12); assert.equal(parameters[1], 'Citizen'); assert.equal(parameters[4], false);
});

test('Profile rejects changing account ownership, sign-in email, and invalid preference types', async () => {
    const api = controller({query: () => { throw new Error('Database must not be called'); }});
    for (const body of [{userId: 22}, {email: 'other@example.com'}, {name: null}, {emailNotifications: 'false'}, {phone: 'not a phone'}, {district: 'x'.repeat(101)}]) {
        const res = response(); await api.updateProfile({user: {userId: 12}, body}, res); assert.equal(res.code, 400);
    }
});

test('Wrong current password does not update the password or revoke sessions', async () => {
    let calls = 0;
    const api = controller({query: async () => { calls++; return {rows: [{id: 12, password_hash: 'old-hash'}]}; }}, {compare: async () => false});
    const res = response(); await api.changePassword({user: {userId: 12}, body: {currentPassword: 'incorrect', newPassword: 'new-password'}}, res);
    assert.equal(res.code, 400); assert.equal(calls, 1);
});

test('Password change uses a guarded update, rotates session version and returns a new token', async () => {
    let calls = 0;
    const api = controller({query: async (sql, values) => {
        calls++; if (calls === 1) return {rows: [{id: 12, password_hash: 'old-hash'}]};
        assert.match(sql, /token_version = token_version \+ 1/); assert.match(sql, /password_hash = \$3/);
        assert.equal(values[1], 'new-hash'); return {rows: [{id: 12, token_version: 3}]};
    }}, {compare: async value => value === 'current-password', hash: async () => 'new-hash'});
    const res = response(); await api.changePassword({user: {userId: 12}, body: {currentPassword: 'current-password', newPassword: 'new-password'}}, res);
    assert.equal(res.code, 200); assert.equal(res.data.token, 'token-v3'); assert.ok(!JSON.stringify(res.data).includes('hash'));
});

test('Bcrypt byte limit rejects multibyte passwords that exceed 72 bytes', async () => {
    const api = controller({query: () => { throw new Error('Must not query'); }});
    const res = response(); await api.changePassword({user: {userId: 12}, body: {currentPassword: 'current-password', newPassword: 'આ'.repeat(25)}}, res);
    assert.equal(res.code, 400);
});

for (const [label, version, rows, expected] of [
    ['current sessions', 2, [{token_version: 2}], 200],
    ['revoked sessions', 1, [{token_version: 2}], 401],
    ['inactive accounts', 0, [], 401],
    ['existing unversioned sessions', undefined, [{token_version: 0}], 200],
]) test(`Authentication handles ${label}`, async () => {
    const auth = load('middleware/userAuth.js', {jsonwebtoken: {verify: () => ({userId: 12, role: 'citizen', tokenVersion: version})}, '../config/db': {query: async () => ({rows})}});
    let next = false; const res = response();
    await auth({headers: {authorization: 'Bearer token'}}, res, () => { next = true; });
    assert.equal(res.code, expected); assert.equal(next, expected === 200);
});

test('Database outages are reported as temporary failures, not expired credentials', async () => {
    const auth = load('middleware/userAuth.js', {jsonwebtoken: {verify: () => ({userId: 12, role: 'citizen'})}, '../config/db': {query: async () => { throw new Error('unavailable'); }}});
    const res = response(); await auth({headers: {authorization: 'Bearer token'}}, res, () => assert.fail('Must not authorize'));
    assert.equal(res.code, 503);
});
