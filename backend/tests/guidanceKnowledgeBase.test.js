
const test = require("node:test");
const assert = require("node:assert/strict");

const knowledgeBase = require("../data/guidanceKnowledgeBase.json");

const requiredCategories = [
  "otp",
  "kyc",
  "job",
  "loan",
  "lottery",
  "digital_arrest",
  "general"
];

test("All required guidance categories exist", () => {
  for (const category of requiredCategories) {
    assert.ok(knowledgeBase[category], `Missing category: ${category}`);
  }
});

for (const category of requiredCategories) {
  test(`${category} guidance has valid structure`, () => {
    const item = knowledgeBase[category];

    assert.ok(item.title);
    assert.ok(item.explanation);

    assert.ok(Array.isArray(item.actions) && item.actions.length > 0);
    assert.ok(Array.isArray(item.precautions) && item.precautions.length > 0);
    assert.ok(Array.isArray(item.sources) && item.sources.length > 0);

    for (const source of item.sources) {
      assert.ok(source.name);
      assert.doesNotThrow(() => new URL(source.url));
      assert.equal(new URL(source.url).protocol, "https:");
    }
  });
}
