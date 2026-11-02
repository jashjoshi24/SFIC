
const test = require("node:test");
const assert = require("node:assert/strict");

const { analyseMessage } = require("../services/messageAnalysisService");
const { getGuidance } = require("../services/guidanceService");

const scenarios = [
  {
    name: "OTP and banking fraud",
    message:
      "Your bank account will be blocked. Share your OTP immediately.",
    expected: ["otp"]
  },
  {
    name: "Fake KYC and Aadhaar",
    message:
      "Your Aadhaar KYC verification is pending. Update your KYC immediately.",
    expected: ["kyc"]
  },
  {
    name: "Job and task scam",
    message:
      "Earn money through online tasks. Pay a registration fee to start your job.",
    expected: ["job"]
  },
  {
    name: "Loan and advance-fee scam",
    message:
      "Instant loan approved. Pay processing fee immediately to receive your loan.",
    expected: ["loan"]
  },
  {
    name: "Digital arrest and impersonation",
    message:
      "Police department has issued a digital arrest notice. Transfer money immediately to avoid arrest.",
    expected: ["digital_arrest"]
  }
];

for (const scenario of scenarios) {
  test(`Guidance integration: ${scenario.name}`, () => {
    const analysis = analyseMessage(scenario.message);
    const result = getGuidance(analysis);

    const actualCategories = result.guidance.map(
      item => item.category
    );

    for (const expectedCategory of scenario.expected) {
      assert.ok(
        actualCategories.includes(expectedCategory),
        `Expected ${expectedCategory}, received: ${actualCategories.join(", ")}`
      );
    }

    for (const item of result.guidance) {
      assert.ok(item.title);
      assert.ok(item.explanation);
      assert.ok(Array.isArray(item.actions));
      assert.ok(Array.isArray(item.precautions));
      assert.ok(Array.isArray(item.sources));

      for (const source of item.sources) {
        assert.ok(source.name);
        assert.ok(
          source.url.startsWith("https://"),
          "Source must use HTTPS"
        );
      }
    }
  });
}

test("Multiple detected categories return multiple guidance sections", () => {
  const message =
    "Your bank account will be blocked. Share your OTP immediately and complete your KYC verification.";

  const analysis = analyseMessage(message);
  const result = getGuidance(analysis);

  assert.ok(result.guidance.length >= 2);
});

test("Guidance contains a disclaimer", () => {
  const analysis = analyseMessage(
    "Your bank account will be blocked. Share your OTP immediately."
  );

  const result = getGuidance(analysis);

  assert.ok(result.disclaimer);
  assert.match(result.disclaimer, /does not confirm/i);
});
