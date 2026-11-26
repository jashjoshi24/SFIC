const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../public/image-scan-results.js'),'utf8');
function renderer(language = 'en') {
  const context = {window:{SG:{lang:()=>language}},URL};
  vm.createContext(context);
  vm.runInContext(source,context);
  return context.window.SGImageResults;
}
test('structured brand findings show a title, explanation and evidence without implementation fields',()=>{
  const html=renderer().indicators([{id:'brand-impersonation',label:'Possible Brand Impersonation',description:'The linked domain is inconsistent with the claimed bank.',weight:30,source:'brand-analysis',evidence:[{claimedBrand:'State Bank of India',detectedDomain:'sdbi.co.in',verdict:'possible_lookalike',confidence:.9,reason:'The domain swaps two characters.',details:'Additional internal context.'}]}]);
  for(const text of ['Possible Brand Impersonation','The linked domain is inconsistent','Claimed brand','State Bank of India','Detected domain','sdbi.co.in','The domain swaps two characters.'])assert.ok(html.includes(text),text);
  for(const hidden of ['brand-impersonation','brand-analysis','possible_lookalike','confidence','weight','Additional internal context.'])assert.ok(!html.includes(hidden),hidden);
  assert.match(html,/<h4>/);assert.match(html,/<dl/);
});
test('guidance has separate ordered actions, precautions and safe reference links',()=>{
  const html=renderer().guidance([{category:'general',title:'General Cyber Safety',explanation:'This does not establish that the message is genuine or safe.',actions:['Verify the sender independently.','Do not share passwords.'],precautions:['Avoid suspicious links.'],sources:[{name:'Reporting portal',url:'https://cybercrime.gov.in/'}]}]);
  assert.match(html,/<h4>General Cyber Safety<\/h4>/);
  assert.match(html,/<ol><li>Verify the sender independently\.<\/li><li>Do not share passwords\.<\/li><\/ol>/);
  assert.match(html,/<ul><li>Avoid suspicious links\.<\/li><\/ul>/);
  assert.match(html,/href="https:\/\/cybercrime.gov.in\/"/);
  assert.match(html,/noopener noreferrer/);
  assert.ok(!html.includes('"category"'));
});
test('untrusted scan values are escaped and unsafe source URLs never become links',()=>{
  const attack='<img src=x onerror=alert(1)>';
  const ui=renderer();
  for(const html of [ui.indicators([{label:attack,description:attack,evidence:[{detectedDomain:attack,reason:attack}]}]),ui.guidance([{title:attack,explanation:attack,actions:[attack],sources:[{name:attack,url:'javascript:alert(1)'}]}])]){
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('&lt;img'));
    assert.ok(!html.includes('href="javascript:'));
  }
});
test('empty, primitive, mixed and partial result shapes remain readable',()=>{
  const ui=renderer();
  assert.match(ui.indicators([]),/No risk indicators/);
  assert.match(ui.guidance(null),/Verify the sender/);
  assert.match(ui.indicators(['Unrecognized sender',{description:'Unexpected payment request'}]),/Unrecognized sender/);
  assert.match(ui.indicators([{description:'Unexpected payment request'}]),/Unexpected payment request/);
  assert.match(ui.guidance({title:'Check first',actions:['Contact your bank.']}),/Contact your bank/);
  assert.equal(ui.text({unknown:{field:'private metadata'}}),'');
  assert.equal(ui.text({payload:'upi://pay?pa=test'}),'upi://pay?pa=test');
  assert.match(ui.urlAnalysis({riskLevel:'High',score:80,indicators:[{label:'Suspicious domain'}]}),/High · 80\/100/);
  assert.match(ui.urlAnalysis({indicators:[{label:'Suspicious domain'}]}),/Suspicious domain/);
});
test('section labels follow Gujarati and Hindi language preferences',()=>{
  assert.match(renderer('gu').guidance({actions:['Verify.']}),/હવે શું કરવું/);
  assert.match(renderer('hi').guidance({precautions:['Verify.']}),/ध्यान रखें/);
});
