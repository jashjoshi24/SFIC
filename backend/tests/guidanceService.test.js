
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getGuidance
} = require("../services/guidanceService");

test("OTP indicator returns OTP guidance", () => {
  const result = getGuidance({
    score: 80,
    riskLevel: "high",
    indicators: [
      { id: "otp" }
    ]
  });

  assert.equal(result.guidance.length, 1);
  assert.equal(result.guidance[0].category, "otp");
});

test("KYC indicator returns KYC guidance", () => {
  const result = getGuidance({
    score: 60,
    riskLevel: "high",
    indicators: [
      { id: "kyc" }
    ]
  });

  assert.equal(result.guidance[0].category, "kyc");
});

test("Multiple indicators return multiple guidance categories", () => {
  const result = getGuidance({
    score: 90,
    riskLevel: "high",
    indicators: [
      { id: "otp" },
      { id: "kyc" }
    ]
  });

  assert.equal(result.guidance.length, 2);
});

test("Unknown indicators return general guidance", () => {
  const result = getGuidance({
    score: 0,
    riskLevel: "low",
    indicators: []
  });

  assert.equal(result.guidance.length, 1);
  assert.equal(result.guidance[0].category, "general");
});

test("Invalid analysis throws an error", () => {
  assert.throws(() => {
    getGuidance(null);
  }, /Invalid analysis result/);
});
