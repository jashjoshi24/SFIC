const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const {createToken} = require('../utils/userToken');

async function updateProfile(req, res) {
    const body = req.body || {};
    const allowed = ['name', 'phone', 'district', 'emailNotifications'];
    if (!Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) {
        return res.status(400).json({success: false, message: 'Provide only name, phone, district, or email notification preferences.'});
    }
    let {name, phone, district, emailNotifications} = body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)) {
        return res.status(400).json({success: false, message: 'Name must contain 2 to 100 characters.'});
    }
    if (phone !== undefined && (typeof phone !== 'string' || (phone.trim() && (!/^[+()\d -]{7,24}$/.test(phone.trim()) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)))) {
        return res.status(400).json({success: false, message: 'Enter a valid phone number or leave it blank.'});
    }
    if (district !== undefined && (typeof district !== 'string' || district.trim().length > 100)) {
        return res.status(400).json({success: false, message: 'City or district must contain at most 100 characters.'});
    }
    if (emailNotifications !== undefined && typeof emailNotifications !== 'boolean') {
        return res.status(400).json({success: false, message: 'Email preference must be true or false.'});
    }
    try {
        const result = await pool.query(
            `UPDATE users SET name = COALESCE($2, name), phone = COALESCE($3, phone),
             district = COALESCE($4, district), email_notifications = COALESCE($5, email_notifications), updated_at = NOW()
             WHERE id = $1 AND is_active = TRUE
             RETURNING id, name, email, phone, district, email_notifications, created_at`,
            [req.user.userId, name?.trim() ?? null, phone?.trim() ?? null, district?.trim() ?? null, emailNotifications ?? null]
        );
        if (!result.rows.length) return res.status(404).json({success: false, message: 'Account not found.'});
        return res.json({success: true, user: result.rows[0]});
    } catch {
        return res.status(500).json({success: false, message: 'Unable to save your profile.'});
    }
}

async function changePassword(req, res) {
    const {currentPassword, newPassword} = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword || Buffer.byteLength(currentPassword) > 72 ||
        typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) {
        return res.status(400).json({success: false, message: 'Enter your current password and a new password of 8 to 72 bytes.'});
    }
    try {
        const account = await pool.query('SELECT id, password_hash FROM users WHERE id = $1 AND is_active = TRUE', [req.user.userId]);
        const user = account.rows[0];
        if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
            return res.status(400).json({success: false, message: 'Current password is incorrect.'});
        }
        if (await bcrypt.compare(newPassword, user.password_hash)) {
            return res.status(400).json({success: false, message: 'Choose a different password from your current one.'});
        }
        const hash = await bcrypt.hash(newPassword, 12);
        const changed = await pool.query(
            `UPDATE users SET password_hash = $2, token_version = token_version + 1, updated_at = NOW()
             WHERE id = $1 AND password_hash = $3 AND is_active = TRUE RETURNING id, token_version`,
            [user.id, hash, user.password_hash]
        );
        if (!changed.rows.length) return res.status(409).json({success: false, message: 'Your account changed. Sign in again and retry.'});
        return res.json({success: true, token: createToken(changed.rows[0]), message: 'Password updated. Other sessions have been signed out.'});
    } catch {
        return res.status(500).json({success: false, message: 'Unable to change your password.'});
    }
}

async function logoutAll(req, res) {
    try {
        await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [req.user.userId]);
        return res.json({success: true, message: 'All sessions have been signed out.'});
    } catch {
        return res.status(500).json({success: false, message: 'Unable to sign out all sessions.'});
    }
}

module.exports = {updateProfile, changePassword, logoutAll};
