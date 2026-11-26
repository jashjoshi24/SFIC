const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function engine(savedLanguage = 'gu') {
  const context = {window: {}, document: {readyState:'loading', addEventListener() {}}, localStorage:{getItem:()=>savedLanguage}, setTimeout, clearTimeout};
  vm.createContext(context);
  for (const file of ['translations-data.js', 'lang-engine.js']) vm.runInContext(fs.readFileSync(path.join(root, 'public', file), 'utf8'), context);
  return context.window;
}
test('every current catalog phrase has complete Hindi and English translations', () => {
  const {SG, SG_TRANSLATIONS: catalog} = engine();
  for (const [source, entry] of Object.entries(catalog)) {
    for (const language of ['hi', 'en']) {
      assert.ok(entry[language]?.trim(), `${language}: ${source}`);
      if (source !== 'ગુજરાતી') assert.doesNotMatch(entry[language], /[\u0A80-\u0ADF]/, `${language}: ${source}`);
      assert.equal(SG.translate(source, language), SG.translate(entry[language], language), `${language}: ${source}`);
    }
  }
});
test('language preference, decorations, whitespace and composed sentences', () => {
  const {SG} = engine('hi');
  assert.equal(SG.lang(), 'hi');
  assert.equal(engine('invalid').SG.lang(), 'gu');
  assert.equal(SG.translate('  ડોમેન\n', 'en'), '  Domain\n');
  assert.equal(SG.translate('🏦 નકલી KYC લિંક', 'en'), '🏦 Fake KYC link');
  assert.equal(SG.translate('ઇમેજનું વિશ્લેષણ પૂર્ણ થયું છે. કોઈ ટેક્સ્ટ મળ્યો નથી.', 'en'), 'Image analysis complete. No text found.');
});
test('templates translate changing counts and preserve variable data', () => {
  const {SG} = engine();
  assert.equal(SG.translate('૨૪ અક્ષરો', 'en'), '24 characters');
  assert.equal(SG.translate('૨૪ અક્ષરો', 'hi'), '२४ अक्षर');
  assert.equal(SG.translate('24 characters', 'gu'), '24 અક્ષરો');
  assert.equal(SG.translate('ફાઇલ: પુરાવો-૧૨.png · 0.25 MB', 'en'), 'File: પુરાવો-૧૨.png · 0.25 MB');
  assert.equal(SG.translate('Member since 12/01/2026', 'hi'), 'सदस्य बनने की तारीख 12/01/2026');
  for (const value of ['https://example.test/ડોમેન?q=૧૨', 'person@example.test', 'My custom message ૧૨', '+91 9876543210']) assert.equal(SG.translate(value, 'en'), value);
});
test('explicit phrases win over colliding translated aliases', () => {
  const win = engine();
  win.SG_TRANSLATIONS = {first:{gu:'જૂનું', hi:'पुराना', en:'Actual source'}, 'Actual source':{gu:'સાચું', hi:'सही', en:'Correct translation'}};
  assert.equal(win.SG.translate('Actual source', 'hi'), 'सही');
});
test('shared translation pages load the catalog before the language engine', () => {
  const files = [path.join(root,'index.html')];
  function walk(dir) { for(const item of fs.readdirSync(dir,{withFileTypes:true})) { const file=path.join(dir,item.name); if(item.isDirectory()) walk(file); else if(file.endsWith('.html')) files.push(file); } }
  walk(path.join(root,'public'));
  for(const file of files) {
    const html=fs.readFileSync(file,'utf8');
    const catalog=html.indexOf('src="/translations-data.js"'), engine=html.indexOf('src="/lang-engine.js"');
    if (engine < 0 && !html.includes('/route-links.js')) continue;
    assert.ok(catalog >= 0 && engine > catalog, file);
    assert.equal(html.split('src="/lang-engine.js"').length, 2, file);
  }
});

test('all scan guidance is available in Hindi and Gujarati', () => {
  const {SG} = engine();
  const guidance = JSON.parse(fs.readFileSync(path.join(root, 'backend/data/guidanceKnowledgeBase.json'), 'utf8'));
  function check(value) {
    if (typeof value === 'string' && value.includes(' ') && !value.startsWith('http')) {
      for(const language of ['hi','gu']) assert.notEqual(SG.translate(value, language), value, `${language}: ${value}`);
    } else if(value && typeof value === 'object') Object.values(value).forEach(check);
  }
  check(guidance);
});
