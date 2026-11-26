const test=require('node:test'), assert=require('node:assert/strict'), vm=require('node:vm'), fs=require('node:fs'), path=require('node:path');
function load(pool, overrides={}){
  const context=vm.createContext({module:{exports:{}},console,require:name=>name==='../config/db'?pool:overrides[name] || require(name)});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../controllers/emailController.js'),'utf8'),context);return context.module.exports;
}
const response=()=>({code:200,status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
test('Support submission atomically stores request and queues acknowledgement for the authenticated account',async()=>{
  const queries=[];const client={async query(sql,values){queries.push([sql,values]);return {rows:sql.includes('support_requests')?[{id:108}]:[]};},release(){}};
  const controller=load({connect:async()=>client}), res=response();
  await controller.createSupport({user:{userId:7},body:{subject:'Help',message:'Private support content',email:'attacker@example.com'}},res);
  assert.equal(res.code,201);assert.equal(res.data.ticketId,108);
  assert.equal(queries[0][0],'BEGIN');assert.equal(queries.at(-1)[0],'COMMIT');
  const outbox=queries.find(([sql])=>sql.includes('email_outbox'));
  assert.equal(outbox[1][1],7);assert.deepEqual(JSON.parse(outbox[1][2]),{ticketId:108});
  assert.ok(!outbox[1][2].includes('Private support content'));
});
test('Failed acknowledgement queue rolls back support creation',async()=>{
  const actions=[];const client={async query(sql){actions.push(sql);if(sql.includes('email_outbox'))throw new Error('offline');return {rows:[{id:108}]};},release(){}};
  const res=response();await load({connect:async()=>client}).createSupport({user:{userId:7},body:{subject:'Help',message:'Please help'}},res);
  assert.equal(res.code,500);assert.equal(actions.at(-1),'ROLLBACK');assert.ok(!actions.includes('COMMIT'));
});
test('Email preferences reject arbitrary fields and bind changes to the signed-in account',async()=>{
  const queries=[];const c=load({query:async(...args)=>{queries.push(args);return {rows:[{}]};}});
  let res=response();await c.preferences({method:'PATCH',user:{userId:7},body:{scamAlerts:false,cybersecurityNewsletter:true}},res);
  assert.equal(res.code,200);assert.match(queries[0][0],/scam_alerts=\$2,cybersecurity_newsletter=\$3 WHERE id=\$1/);assert.equal(queries[0][1][0],7);
  res=response();await c.preferences({method:'PATCH',user:{userId:7},body:JSON.parse('{"__proto__":true}')},res);assert.equal(res.code,400);
});
test('Campaign queue uses consent filters and retries of the same request do not create messages',async()=>{
  for(const duplicate of [false,true]){
    const queries=[];const client={async query(sql,params){queries.push([sql,params]);if(sql.startsWith('INSERT INTO email_campaigns'))return {rows:duplicate?[]:[{id:12}]};if(sql.startsWith('SELECT c.id'))return {rows:[{id:12,queued:2}]};if(sql.includes('INSERT INTO email_outbox'))return {rows:[{id:1},{id:2}],rowCount:2};return {rows:[]};},release(){}};
    const res=response();await load({connect:async()=>client}).queueCampaign({admin:{id:3},body:{type:'scam_alert',title:'Stay safe',summary:'Check carefully',tips:['Verify independently.'],requestKey:'9c957336-93c3-4f40-bcca-0a78329817a1'}},res);
    assert.equal(res.data.queued,2);assert.equal(queries.filter(([sql])=>sql.includes('INSERT INTO email_outbox')).length,duplicate?0:1);
    if(!duplicate)assert.ok(queries.some(([sql])=>sql.includes('is_active=TRUE AND scam_alerts=TRUE')));
    assert.equal(queries.at(-1)[0],'COMMIT');
  }
});
test('A service announcement queues all active accounts and can be previewed without tips', async () => {
  const queries = [];
  const client = {
    release() {},
    async query(sql, params) {
      queries.push([sql, params]);
      if (sql.startsWith('INSERT INTO email_campaigns')) return {rows:[{id:12}]};
      return {rows:[], rowCount:2};
    },
  };
  const controller = load({connect:async () => client});
  const body = {type:'account_announcement', title:'Service update', summary:'Maintenance ends at noon.', tips:[]};
  const preview = response();
  controller.preview({body}, preview);
  assert.equal(preview.data.subject, 'Service update');
  assert.ok(!preview.data.html.includes('WHAT YOU SHOULD KNOW'));
  const res = response();
  await controller.queueCampaign({admin:{id:3}, body:{...body, requestKey:'9c957336-93c3-4f40-bcca-0a78329817a1'}}, res);
  assert.equal(res.code, 201);
  const [sql, params] = queries.find(([sql]) => sql.includes('INSERT INTO email_outbox'));
  assert.match(sql, /WHERE is_active=TRUE\s+RETURNING id/);
  assert.equal(params[1], 'account_announcement');
});

test('Immediate dispatch is scoped to editions owned by the signed-in administrator', async () => {
  const queries = [];
  const dispatch = [];
  const status = {accepted:2, skipped:0, failed:0, pending:1, ready:0};
  const controller = load({
    async query(sql, params) {
      queries.push(params);
      if (sql.startsWith('SELECT id')) return {rows:params[1] === 3 ? [{id:12}] : []};
      return {rows:[status]};
    },
  }, {
    '../services/emailService': {emailService:{configuration:() => ({enabled:true, missing:[]})}},
    '../services/emailWorkflows': {workflows:() => ({
      deliver: async (limit, options) => { dispatch.push([limit, options.campaignId]); return {processed:2}; },
    })},
  });
  const denied = response();
  await controller.sendCampaign({admin:{id:4}, params:{id:'12'}}, denied);
  assert.equal(denied.code, 404);
  assert.equal(dispatch.length, 0);
  const res = response();
  await controller.sendCampaign({admin:{id:3}, params:{id:'12'}}, res);
  assert.deepEqual(dispatch, [[20, '12']]);
  assert.equal(queries.at(-1)[0], 'campaign:12:%');
  assert.equal(res.data.accepted, 2);
  assert.equal(res.data.pending, 1);
});
test('New complaint and admin notification queue commit together before citizen notification',async()=>{
  for(const failQueue of [false,true]){
    const actions=[];
    const client={query:async sql=>{actions.push(sql.startsWith('INSERT')?'INSERT':sql);return {rows:[{id:42,created_at:new Date()}]};},release(){}};
    const context=vm.createContext({module:{exports:{}},console:{error(){}},require:name=>{
      if(name==='../config/db')return {connect:async()=>client};
      if(name==='../services/emailWorkflows')return {workflows:()=>({queueAdminComplaint:async(id,db)=>{assert.equal(id,42);assert.equal(db,client);actions.push('QUEUE');if(failQueue)throw new Error('unavailable');}})};
      if(name==='../services/emailService')return {notifyCitizen:async()=>{assert.ok(actions.includes('COMMIT'));actions.push('CITIZEN');}};
      throw new Error(name);
    }});
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../controllers/complaintController.js'),'utf8'),context);
    const res=response();await context.module.exports.generateComplaint({user:{userId:7},body:{incidentDescription:'Private incident',complaintText:'Private draft'}},res);
    assert.equal(res.code,failQueue?500:201);
    assert.equal(actions.join(','),failQueue?'BEGIN,INSERT,QUEUE,ROLLBACK':'BEGIN,INSERT,QUEUE,COMMIT,CITIZEN');
  }
});
