
const test = require("node:test");
const assert = require("node:assert/strict");

const {
    analyseURL,
    analyseURLHybrid
} = require("../services/urlAnalysisService");

// ------------------------------------------
// EXISTING HEURISTIC TESTS
// ------------------------------------------
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
    const result = analyseURL(
        "https://user:pass@example.com"
    );
    const result = analyseURL("https://user:pass@example.com");

    assert.ok(
        result.indicators.some(item =>
            item.label === "URL contains embedded login credentials"
        )
    );
});

// Bare domains are accepted and normalized to HTTPS.
test("Bare domain should be accepted with HTTPS normalization", () => {
    const result = analyseURL("google.com");

    assert.equal(result.riskLevel, "low");
    assert.equal(result.score, 0);
    assert.equal(result.indicators.length, 0);
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

// ------------------------------------------
// HYBRID SCANNER TESTS
// ------------------------------------------

function mockResponse(data, ok = true) {
    return {
        ok,
        status: ok ? 200 : 500,
        json: async () => data
    };
}

test("Hybrid scanner should detect Safe Browsing threat", async () => {
    const mockFetch = async requestUrl => {
        if (requestUrl.includes("safebrowsing.googleapis.com")) {
            return mockResponse({
                matches: [
                    {
                        threatType: "SOCIAL_ENGINEERING"
                    }
                ]
            });
        }

        return mockResponse({});
    };

    const result = await analyseURLHybrid(
        "https://example.com",
        {
            safeBrowsingApiKey: "test-key",
            webRiskApiKey: "test-key",
            fetchImpl: mockFetch
        }
    );

    assert.equal(result.status, "hybrid");
    assert.equal(result.score, 100);
    assert.equal(result.riskLevel, "high");
    assert.equal(result.verification.confirmedThreat, true);

    assert.ok(
        result.indicators.some(item =>
            item.id === "google-threat-intelligence-match"
        )
    );
});

test("Hybrid scanner should detect Web Risk threat", async () => {
    const mockFetch = async requestUrl => {
        if (requestUrl.includes("webrisk.googleapis.com")) {
            return mockResponse({
                threat: {
                    threatTypes: ["MALWARE"]
                }
            });
        }

        return mockResponse({});
    };

    const result = await analyseURLHybrid(
        "https://example.com",
        {
            safeBrowsingApiKey: "test-key",
            webRiskApiKey: "test-key",
            fetchImpl: mockFetch
        }
    );

    assert.equal(result.score, 100);
    assert.equal(result.riskLevel, "high");
    assert.equal(result.verification.confirmedThreat, true);
    assert.ok(result.verification.threatTypes.includes("MALWARE"));
});

test("Clean external checks should preserve heuristic score", async () => {
    const mockFetch = async () => mockResponse({});

    const result = await analyseURLHybrid(
        "https://google.com",
        {
            safeBrowsingApiKey: "test-key",
            webRiskApiKey: "test-key",
            fetchImpl: mockFetch
        }
    );

    assert.equal(result.status, "hybrid");
    assert.equal(result.score, 0);
    assert.equal(result.riskLevel, "low");
    assert.equal(result.verification.confirmedThreat, false);
    assert.equal(result.verification.status, "complete");
});

test("Hybrid scanner should work if API keys are missing", async () => {
    const result = await analyseURLHybrid(
        "https://google.com",
        {
            safeBrowsingApiKey: "",
            webRiskApiKey: "",
            fetchImpl: async () => {
                throw new Error("Fetch should not be called");
            }
        }
    );

    assert.equal(result.status, "hybrid");
    assert.equal(result.verification.status, "not_configured");
    assert.equal(result.verification.confirmedThreat, false);
});

test("Hybrid scanner should report partial verification if one API fails", async () => {
    const mockFetch = async requestUrl => {
        if (requestUrl.includes("safebrowsing.googleapis.com")) {
            throw new Error("Network unavailable");
        }

        return mockResponse({});
    };

    const result = await analyseURLHybrid(
        "https://google.com",
        {
            safeBrowsingApiKey: "test-key",
            webRiskApiKey: "test-key",
            fetchImpl: mockFetch
        }
    );

    assert.equal(result.verification.status, "partial");
    assert.equal(result.verification.confirmedThreat, false);
});

test("Hybrid scanner should handle both API failures", async () => {
    const mockFetch = async () => {
        throw new Error("Network unavailable");
    };

    const result = await analyseURLHybrid(
        "https://google.com",
        {
            safeBrowsingApiKey: "test-key",
            webRiskApiKey: "test-key",
            fetchImpl: mockFetch
        }
    );

    assert.equal(result.verification.status, "unavailable");
    assert.equal(result.verification.confirmedThreat, false);
    assert.equal(result.riskLevel, "low");
});
