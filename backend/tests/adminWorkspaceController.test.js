const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function setup(rows=[]){
 const queries=[];const context={module:{exports:{}},console,require:()=>({query:async(sql,values)=>{queries.push({sql,values});return{rows:rows[queries.length-1]||[]};}})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controllers/adminWorkspaceController.js'),'utf8'),context);
 const res={code:200,status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
 return{...context.module.exports,queries,res};
}
test('citizen search uses bound values and omits credential fields',async()=>{
 const s=setup([[{count:'1'}],[{id:'1',name:'Citizen',email:'citizen@example.com',scan_count:'2',complaint_count:'0'}]]);
 await s.getCitizens({query:{search:"a' OR 1=1 --",page:'2'}},s.res);
 assert.equal(s.res.code,200);assert.equal(s.res.data.pagination.page,2);
 assert.deepEqual(Array.from(s.queries[1].values),["%a' OR 1=1 --%","a' OR 1=1 --",20,20]);
 assert.doesNotMatch(s.queries[1].sql,/password|token_version|SELECT \*/i);
});
test('invalid directory parameters are rejected before querying',async()=>{
 for(const query of [{page:'-1'},{search:['x']},{search:'x'.repeat(201)}]){const s=setup();await s.getCitizens({query},s.res);assert.equal(s.res.code,400);assert.equal(s.queries.length,0);}
});
test('reports sum daily results and use India reporting boundaries',async()=>{
 const s=setup([[{date:'2026-11-26',scans:'3',high_risk:'1',messages:'1',urls:'1',images:'1',complaints:'2',registrations:'4'},{date:'2026-11-25',scans:'0',high_risk:'0',messages:'0',urls:'0',images:'0',complaints:'0',registrations:'0'}],[{level:'high',count:'1'}]]);
 await s.getActivityReport({query:{days:'7'}},s.res);
 assert.equal(s.res.data.totals.scans,3);assert.equal(s.res.data.totals.registrations,4);assert.equal(s.res.data.timezone,'Asia/Kolkata');
 assert.match(s.queries[0].sql,/generate_series/);assert.match(s.queries[0].sql,/Asia\/Kolkata/);assert.equal(s.queries[0].values[0],7);
});
test('unsupported reporting windows are rejected',async()=>{
 for(const days of ['1','365','7 OR 1=1',['7']]){const s=setup();await s.getActivityReport({query:{days}},s.res);assert.equal(s.res.code,400);assert.equal(s.queries.length,0);}
});
