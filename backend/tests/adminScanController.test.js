const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function controller() {
  const queries = [];
  const context = {module: {exports: {}}, console, require: () => ({query: async (sql, values) => {
    queries.push({sql, values});
    return {rows: sql.includes('COUNT(*)') ? [{count: '1'}] : [{id: '4', scan_type: 'image', risk_level: 'high'}]};
  }})};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/adminScanController.js'), 'utf8'), context);
  return {run: context.module.exports.getAllScans, queries};
}
function response() {
  return {statusCode: 200, status(code) {this.statusCode=code;return this;}, json(data) {this.data=data;return this;}};
}
test('image scans can be filtered by type with risk and pagination', async () => {
  const {run, queries} = controller();
  const res = response();
  await run({query: {type: 'image', risk: 'high', page: '2', limit: '10'}}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.scans[0].scan_type, 'image');
  assert.equal(queries.length, 2);
  assert.deepEqual(Array.from(queries[1].values), ['image', 'high', 10, 10]);
  assert.match(queries[1].sql, /scan_type = \$1 AND LOWER\(risk_level\) = \$2/);
});
test('unsupported scan types are rejected before querying the database', async () => {
  const {run, queries} = controller();
  const res = response();
  await run({query: {type: 'unknown'}}, res);
  assert.equal(res.statusCode, 400);
  assert.equal(queries.length, 0);
});
