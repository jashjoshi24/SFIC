const test=require('node:test');
const assert=require('node:assert/strict');
const {renderEmail,TYPES}=require('../services/emailTemplates');
const {createWorkflows}=require('../services/emailWorkflows');
const env={EMAIL_APP_URL:'https://safety.example.com'};
test('Email templates have safe HTML, Gujarati, plain text and preference links',()=>{
  for(const type of TYPES){
    const m=renderEmail(type,{name:'<script>private</script>',complaintId:42,ticketId:108,status:'Pending',pendingCount:9,reviewCount:3,title:'<img src=x onerror=alert(1)>',summary:'<script>bad()</script>',tips:['<b>Never share OTPs</b>']},env);
    assert.ok(!m.html.includes('<script>'));assert.ok(!m.html.includes('<img src=x'));
    assert.ok(m.html.includes('lang="gu"'));assert.ok(m.text.includes('Email preferences: https://safety.example.com/support/index.html#email-preferences'));
    assert.ok(m.html.includes('max-width:600px'));assert.ok(m.text.includes('does not submit a police complaint'));
  }
  assert.throws(()=>renderEmail('support_acknowledgement',{ticketId:'bad'},env));
  assert.throws(()=>renderEmail('admin_pending_digest',{pendingCount:-1},env));
});
function fixture(job,user,extraRows=[{id:42}],sendResult='accepted'){
  const queries=[],sends=[];let taken=false;
  const client={release(){},async query(sql,params){
    queries.push([sql,params]);
    if(sql.includes('FOR UPDATE SKIP LOCKED')){if(taken)return {rows:[]};taken=true;return {rows:[{id:1,attempts:0,created_at:new Date(),data:{complaintId:42},...job}]};}
    if(sql.includes('FROM users')||sql.includes('FROM admin_users'))return {rows:user?[user]:[]};
    if(sql.includes('FROM complaint_drafts'))return {rows:extraRows};
    return {rows:[]};
  }};
  const service={configuration:()=>({enabled:true,missing:[]}),send:async(...args)=>{sends.push(args);return {status:sendResult};}};
  const pool={connect:async()=>client,query:async(...args)=>{queries.push(args);return {rows:[]};}};
  return {jobs:createWorkflows({pool,service}),queries,sends};
}
test('Queued optional emails recheck consent and active state at delivery time',async()=>{
  for(const [type,pref] of [['draft_reminder','draft_reminders'],['scam_alert','scam_alerts'],['cybersecurity_newsletter','cybersecurity_newsletter']]){
    for(const optedIn of [true,false]){
      const f=fixture({type,user_id:7},{name:'Citizen',email:'owner@example.com',is_active:true,[pref]:optedIn});
      await f.jobs.deliver();assert.equal(f.sends.length,optedIn?1:0);
      const update=f.queries.find(([sql])=>sql.startsWith('UPDATE email_outbox'));assert.equal(update[1][1],optedIn?'accepted':'skipped');
      if(optedIn)assert.equal(f.sends[0][1].email,'owner@example.com');
    }
  }
});
test('Immediate delivery only claims the selected campaign and skips inactive accounts', async () => {
  for (const active of [true, false]) {
    const f = fixture({type:'account_announcement', user_id:7},
      {is_active:active, scam_alerts:false, cybersecurity_newsletter:false, email:'citizen@example.com'});
    await f.jobs.deliver(20, {campaignId:'12'});
    const claim = f.queries.find(([sql]) => sql.includes('FOR UPDATE SKIP LOCKED'));
    assert.match(claim[0], /AND dedupe_key LIKE \$1/);
    assert.deepEqual(claim[1], ['campaign:12:%']);
    assert.equal(f.sends.length, active ? 1 : 0);
  }
});
test('Resolved or deleted drafts do not send reminders',async()=>{
  const f=fixture({type:'draft_reminder',user_id:7},{is_active:true,draft_reminders:true},[]);await f.jobs.deliver();assert.equal(f.sends.length,0);
});
test('Failed transport is retried and terminates after the third attempt',async()=>{
  for(const attempts of [0,2]){
    const f=fixture({type:'support_acknowledgement',user_id:7,attempts},{is_active:true},[],'failed');await f.jobs.deliver();
    assert.equal(f.queries.find(([sql])=>sql.startsWith('UPDATE email_outbox'))[1][1],attempts===2?'failed':'pending');
  }
});
test('Admin messages only use active saved admin recipients and stale digests are skipped',async()=>{
  for(const [is_active,created_at,expected] of [[true,new Date(),1],[false,new Date(),0],[true,new Date(0),0]]){
    const f=fixture({type:'admin_pending_digest',admin_id:3,created_at},{is_active,email:'admin@example.com'});await f.jobs.deliver();assert.equal(f.sends.length,expected);
  }
});
test('Scheduling and new-draft notifications use persisted dedupe keys and consent',async()=>{
  const f=fixture({},null);await f.jobs.schedule();await f.jobs.queueAdminComplaint(42);
  const sql=f.queries.map(([s])=>s).join('\n');
  assert.ok(sql.includes("INTERVAL '3 days'"));assert.ok(sql.includes('u.draft_reminders=TRUE'));
  assert.ok(sql.includes("Asia/Kolkata"));assert.ok(sql.includes("TIME '09:00'"));
  assert.equal(sql.match(/ON CONFLICT\(dedupe_key\) DO NOTHING/g).length,3);
});
test('Disabled worker never consumes pending messages',async()=>{
  let connected=false;const jobs=createWorkflows({pool:{connect:async()=>{connected=true;}},service:{configuration:()=>({enabled:false,missing:[]})}});
  assert.deepEqual(await jobs.deliver(),{disabled:true,processed:0});assert.equal(connected,false);
});
