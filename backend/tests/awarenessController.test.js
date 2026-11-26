const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {validateGuide}=require('../utils/awarenessGuide');
const guide=()=>({id:'test-guide',source:'https://example.com/reference',category:{en:'Safety'},content:{en:{title:'Test guide',summary:'A test summary',warnings:['One warning'],actions:['One action']}}});
test('English-only guides are valid, optional translations remain absent',()=>{const result=validateGuide(guide());assert.equal(result.content.en.title,'Test guide');assert.equal(result.content.gu,undefined);assert.equal(result.image,'');});
test('all existing multilingual seed guides validate',()=>{const seed=JSON.parse(fs.readFileSync(path.join(__dirname,'../database/awareness-seed.json'),'utf8'));for(const data of seed)assert.equal(validateGuide(data).id,data.id);});
test('malformed IDs, unsafe URLs and incomplete translations are rejected',()=>{
 for(const modify of [g=>g.id='../invalid',g=>g.source='javascript:alert(1)',g=>g.image='data:image/svg+xml,test',g=>g.source='https://user:pass@example.com',g=>g.content.en.warnings=[],g=>g.content.en.title='x'.repeat(201),g=>g.category.gu='અધૂરી']){const g=guide();modify(g);assert.throws(()=>validateGuide(g));}
});
function setup(rows=[]){
 const queries=[];const context={module:{exports:{}},console,require:name=>name.includes('awarenessGuide')?{validateGuide}:{query:async(sql,values)=>{queries.push({sql,values});return{rows};}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controllers/awarenessController.js'),'utf8'),context);
 const res={code:200,status(code){this.code=code;return this;},set(){return this;},json(data){this.data=data;return this;}};
 return{...context.module.exports,queries,res};
}
test('public library excludes deleted guides and admin-only metadata',async()=>{const s=setup([{data:guide(),version:3}]);await s.publicGuides({},s.res);assert.match(s.queries[0].sql,/deleted_at IS NULL/);assert.equal(s.res.data.guides[0].version,undefined);});
test('edits reject missing versions and detect stale versions',async()=>{
 const s=setup();await s.updateGuide({params:{id:'test-guide'},body:guide()},s.res);assert.equal(s.res.code,400);assert.equal(s.queries.length,0);
 await s.updateGuide({params:{id:'test-guide'},body:{...guide(),version:1},admin:{id:1}},s.res);assert.equal(s.res.code,409);assert.match(s.queries[0].sql,/version=\$4 AND deleted_at IS NULL/);
});
test('deletion is reversible and version checked',async()=>{const s=setup([{id:'test-guide'}]);await s.deleteGuide({params:{id:'test-guide'},body:{version:2},admin:{id:1}},s.res);assert.equal(s.res.code,200);assert.match(s.queries[0].sql,/deleted_at=NOW\(\)/);assert.doesNotMatch(s.queries[0].sql,/DELETE FROM/);assert.deepEqual(Array.from(s.queries[0].values),[1,'test-guide',2]);});
