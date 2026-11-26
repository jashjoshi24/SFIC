const assert = require('node:assert/strict');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
(async () => {
 let userId;
 const base = 'http://localhost:5000';
 async function request(path, body, token, expected=200) {
  const r = await fetch(base+path, {method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();
  assert.equal(r.status,expected,`${path}: ${JSON.stringify(data)}`);
  console.log(`${path}: HTTP ${r.status}`);
  return data;
 }
 try {
  const email=`local-smoke-${crypto.randomUUID()}@example.invalid`, password=crypto.randomBytes(24).toString('hex');
  const reg=await request('/api/auth/register',{name:'Local setup verification',email,password},null,201);
  userId=reg.user.id;
  assert.ok(reg.token);
  const login=await request('/api/auth/login',{email,password});
  const token=login.token;
  await request('/api/auth/me',null,token);
  const scan=await request('/api/scans/message',{message:'Share your OTP immediately or your bank account will be blocked.'},token);
  assert.ok(scan.result.score>0);
  const url=await request('/api/scans/url',{url:'https://example.com'},token);
  console.log('URL external checks:',JSON.stringify(url.result.externalChecks || url.result.externalVerification || url.result.status));
  await request('/api/scans/history',null,token);
  const guidance=await request('/api/guidance',{message:'Share your OTP immediately'},token);
  assert.ok(guidance.guidance.length);
  await request('/api/guidance/complaint',{incidentDescription:'Local setup automated verification only.',complaintText:'Temporary verification draft; no real incident.',scanId:scan.scanId},token,201);
  await request('/api/guidance/complaints/history',null,token);
  await request('/api/scans/history',null,null,401);
  await request('/api/admin/me',null,null,401);
  const admins=await pool.query('SELECT id, role FROM admin_users WHERE is_active=TRUE LIMIT 1');
  if(admins.rows.length){
   const admin=admins.rows[0];
   const adminToken=jwt.sign({sub:admin.id,role:admin.role},process.env.ADMIN_JWT_SECRET,{expiresIn:'1m'});
   await request('/api/admin/dashboard/stats',null,adminToken);
   await request('/api/admin/scans',null,adminToken);
   await request('/api/admin/complaints',null,adminToken);
   console.log('Admin read APIs verified with a short-lived internal token; existing admin password unchanged.');
  } else console.log('No active administrator exists; create one with backend/scripts/createAdmin.js.');
 } finally {
  if(userId){
   await pool.query('DELETE FROM complaint_drafts WHERE user_id=$1',[userId]);
   await pool.query('DELETE FROM scan_history WHERE user_id=$1',[userId]);
   await pool.query('DELETE FROM users WHERE id=$1',[userId]);
   console.log('Removed temporary verification account, scans, and complaint.');
  }
  await pool.end();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});

