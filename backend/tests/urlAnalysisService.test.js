
const test = require("node:test");
const assert = require("node:assert/strict");

const { analyseURL } = require("../services/urlAnalysisService");

test("Normal HTTPS URL should return no indicators", () => {
    const result = analyseURL("https://google.com");

    assert.equal(result.riskLevel, "low");
    assert.equal(result.score, 0);
    assert.equal(result.indicators.length, 0);
});

test("HTTP URL should be flagged", () => {
    const result = analyseURL("http://example.com");

    assert.ok(
        result.indicators.some(item =>
            item.label === "Insecure HTTP connection"
        )
    );
});

test("Shortened URL should be flagged", () => {
    const result = analyseURL("https://bit.ly/example");

    assert.ok(
        result.indicators.some(item =>
            item.label === "URL shortener detected"
        )
    );
});

test("IP-based URL should be flagged", () => {
    const result = analyseURL("https://192.168.1.1/login");

    assert.ok(
        result.indicators.some(item =>
            item.label === "URL uses an IP address instead of a domain"
        )
    );
});

test("URL with embedded credentials should be flagged", () => {
    const result = analyseURL("https://user:pass@example.com");

    assert.ok(
        result.indicators.some(item =>
            item.label === "URL contains embedded login credentials"
        )
    );
});

test("Plain text should be rejected", () => {
    assert.throws(
        () => analyseURL("google.com"),
        /Only HTTP and HTTPS/
    );
});

test("Unsupported protocol should be rejected", () => {
    assert.throws(
        () => analyseURL("javascript:alert(1)")
    );
});

test("Empty URL should be rejected", () => {
    assert.throws(
        () => analyseURL("")
    );
});

test("Local hostname should be flagged", () => {
    const result = analyseURL("http://localhost");

    assert.ok(
        result.indicators.some(item =>
            item.label === "Local or non-public hostname detected"
        )
    );
});
