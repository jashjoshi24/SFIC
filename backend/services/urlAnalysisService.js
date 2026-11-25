
const { parse } = require("tldts");
const net = require("node:net");

const SHORTENER_DOMAINS = [
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "is.gd",
    "cutt.ly",
    "rb.gy",
    "shorturl.at",
    "ow.ly"
];

// Illustrative brand list. Expand only with verified official domains.
const TRUSTED_BRANDS = [
    { name: "paypal", domains: ["paypal.com"] },
    { name: "google", domains: ["google.com"] },
    { name: "microsoft", domains: ["microsoft.com"] },
    { name: "amazon", domains: ["amazon.com", "amazon.in"] },
    { name: "apple", domains: ["apple.com"] },
    { name: "sbi", domains: ["sbi.co.in", "onlinesbi.sbi"] },
    { name: "hdfc", domains: ["hdfcbank.com"] },
    { name: "icici", domains: ["icicibank.com"] },
    { name: "uidai", domains: ["uidai.gov.in"] }
];

const SUSPICIOUS_KEYWORDS = [
    "verify",
    "verification",
    "secure",
    "security",
    "login",
    "update",
    "account",
    "kyc",
    "wallet",
    "payment",
    "confirm",
    "password"
];

const THREAT_TYPES = [
    "MALWARE",
    "SOCIAL_ENGINEERING",
    "UNWANTED_SOFTWARE"
];

const REQUEST_TIMEOUT_MS = 10000;

function isDomainMatch(hostname, domains) {
    return domains.some(domain =>
        hostname === domain || hostname.endsWith(`.${domain}`)
    );
}


function validateAndParseURL(input) {
    if (typeof input !== "string" || !input.trim()) {
        throw new Error("Please provide a URL.");
    }

    let rawUrl = input.trim();

    if (rawUrl.length > 2048) {
        throw new Error("URL exceeds the 2048 character limit.");
    }

    if (/[\s\u0000-\u001F\u007F]/.test(rawUrl)) {
        throw new Error("URL contains invalid characters.");
    }

    // Reject unsupported protocols instead of treating them as domains.
    if (
        /^[a-z][a-z0-9+.-]*:/i.test(rawUrl) &&
        !/^https?:\/\//i.test(rawUrl)
    ) {
        throw new Error("Only HTTP and HTTPS URLs are supported.");
    }

    // OCR and messages sometimes extract domains without a protocol.
    // Example: www.example.com -> https://www.example.com
    if (!/^https?:\/\//i.test(rawUrl)) {
        rawUrl = `https://${rawUrl}`;
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(rawUrl);
    } catch {
        throw new Error("Invalid URL format.");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Unsupported URL protocol.");
    }

    if (!parsedUrl.hostname) {
        throw new Error("URL hostname is missing.");
    }

    return parsedUrl;
}


/**
 * Existing SFIC heuristic URL scanner.
 * This remains synchronous and can still be used independently.
 */
function analyseURL(input) {
    const parsedUrl = validateAndParseURL(input);

    const hostname = parsedUrl.hostname.toLowerCase();
    const reasons = [];

    if (parsedUrl.username || parsedUrl.password) {
        reasons.push("URL contains embedded login credentials");
    }

    if (parsedUrl.protocol === "http:") {
        reasons.push("Insecure HTTP connection");
    }

    const domainInfo = parse(hostname);

    if (net.isIP(hostname)) {
        reasons.push("URL uses an IP address instead of a domain");
    }

    if (
        SHORTENER_DOMAINS.some(domain =>
            hostname === domain || hostname.endsWith(`.${domain}`)
        )
    ) {
        reasons.push("URL shortener detected");
    }

    if (hostname.startsWith("xn--") || hostname.includes(".xn--")) {
        reasons.push("Internationalized or punycode hostname detected");
    }

    const labels = hostname.split(".");

    if (labels.length > 5) {
        reasons.push("Unusually high number of subdomains");
    }

    if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal") ||
        hostname.endsWith(".test")
    ) {
        reasons.push("Local or non-public hostname detected");
    }

    const registeredDomain = domainInfo.domain || hostname;

    for (const brand of TRUSTED_BRANDS) {
        const containsBrandName = hostname
            .split(".")
            .some(label => label.includes(brand.name));

        if (
            containsBrandName &&
            !isDomainMatch(hostname, brand.domains)
        ) {
            reasons.push(
                `Possible ${brand.name} brand impersonation`
            );
        }
    }

    // Keywords are weak signals. They do not independently prove phishing.
    const urlText = `${hostname}${parsedUrl.pathname}`.toLowerCase();

    const matchedKeywords = SUSPICIOUS_KEYWORDS.filter(keyword =>
        urlText.includes(keyword)
    );

    if (matchedKeywords.length >= 3) {
        reasons.push("Multiple security-sensitive URL keywords detected");
    }

    const indicatorWeights = {
        "URL contains embedded login credentials": 30,
        "Insecure HTTP connection": 15,
        "URL uses an IP address instead of a domain": 25,
        "URL shortener detected": 20,
        "Internationalized or punycode hostname detected": 15,
        "Unusually high number of subdomains": 10,
        "Local or non-public hostname detected": 0,
        "Multiple security-sensitive URL keywords detected": 10
    };

    const getWeight = reason => {
        if (
            reason.startsWith("Possible ") &&
            reason.endsWith(" brand impersonation")
        ) {
            return 35;
        }

        return indicatorWeights[reason] || 0;
    };

    const score = Math.min(
        100,
        reasons.reduce((total, reason) => total + getWeight(reason), 0)
    );

    let riskLevel = "low";

    if (score >= 50) {
        riskLevel = "high";
    } else if (score >= 20) {
        riskLevel = "medium";
    }

    const indicators = reasons.map(reason => ({
        id: reason.toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        label: reason,
        weight: getWeight(reason)
    }));

    return {
        status: "heuristic",
        score,
        riskLevel,
        hostname,
        domain: registeredDomain,
        indicators,
        recommendation:
            reasons.length > 0
                ? "Do not enter passwords, OTPs or financial information until the website is independently verified."
                : "No obvious risk indicators found. This does not establish that the website is safe.",
        disclaimer:
            "This analysis checks URL structure and configured heuristics only. Brand and keyword matches are warning signals, not proof of phishing. It does not verify website content, reputation, ownership or malware status."
    };
}

/**
 * Performs an HTTP request with a timeout.
 */
async function fetchWithTimeout(fetchImpl, url, options = {}) {
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
    );

    try {
        return await fetchImpl(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Google Safe Browsing API lookup.
 */
async function checkGoogleSafeBrowsing(url, apiKey, fetchImpl) {
    if (!apiKey) {
        return {
            configured: false,
            status: "not_configured",
            match: false,
            threatTypes: []
        };
    }

    try {
        const endpoint = new URL(
            "https://safebrowsing.googleapis.com/v4/threatMatches:find"
        );

        endpoint.searchParams.set("key", apiKey);

        const response = await fetchWithTimeout(
            fetchImpl,
            endpoint.toString(),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    client: {
                        clientId: "sfic",
                        clientVersion: "1.0.0"
                    },
                    threatInfo: {
                        threatTypes: THREAT_TYPES,
                        platformTypes: ["ANY_PLATFORM"],
                        threatEntryTypes: ["URL"],
                        threatEntries: [{ url }]
                    }
                })
            }
        );

        if (!response.ok) {
            return {
                configured: true,
                status: "api_error",
                match: false,
                threatTypes: []
            };
        }

        const data = await response.json();

        const matches = Array.isArray(data.matches)
            ? data.matches
            : [];

        const threatTypes = [
            ...new Set(matches.map(item => item.threatType).filter(Boolean))
        ];

        return {
            configured: true,
            status: "success",
            match: matches.length > 0,
            threatTypes
        };
    } catch (error) {
        return {
            configured: true,
            status: error.name === "AbortError" ? "timeout" : "unavailable",
            match: false,
            threatTypes: []
        };
    }
}

/**
 * Google Web Risk API lookup.
 */
async function checkGoogleWebRisk(url, apiKey, fetchImpl) {
    if (!apiKey) {
        return {
            configured: false,
            status: "not_configured",
            match: false,
            threatTypes: []
        };
    }

    try {
        const endpoint = new URL(
            "https://webrisk.googleapis.com/v1/uris:search"
        );

        endpoint.searchParams.set("key", apiKey);
        endpoint.searchParams.set("uri", url);

        for (const threatType of THREAT_TYPES) {
            endpoint.searchParams.append("threatTypes", threatType);
        }

        const response = await fetchWithTimeout(
            fetchImpl,
            endpoint.toString(),
            { method: "GET" }
        );

        if (!response.ok) {
            return {
                configured: true,
                status: "api_error",
                match: false,
                threatTypes: []
            };
        }

        const data = await response.json();

        const threatTypes = [
            ...new Set(
                (data.threat?.threatTypes || []).filter(Boolean)
            )
        ];

        return {
            configured: true,
            status: "success",
            match: threatTypes.length > 0,
            threatTypes
        };
    } catch (error) {
        return {
            configured: true,
            status: error.name === "AbortError" ? "timeout" : "unavailable",
            match: false,
            threatTypes: []
        };
    }
}

/**
 * Hybrid scanner:
 * 1. Existing heuristic analysis.
 * 2. Google Safe Browsing.
 * 3. Google Web Risk.
 *
 * API keys are read from backend environment variables.
 * Optional options are provided for automated testing.
 */
async function analyseURLHybrid(input, options = {}) {
    // Validate once and preserve the existing heuristic result.
    const heuristicResult = analyseURL(input);

    const parsedUrl = validateAndParseURL(input);
    const url = parsedUrl.toString();

    const safeBrowsingApiKey =
        options.safeBrowsingApiKey ??
        process.env.GOOGLE_SAFE_BROWSING_API_KEY;

    const webRiskApiKey =
        options.webRiskApiKey ??
        process.env.GOOGLE_WEB_RISK_API_KEY;

    const fetchImpl = options.fetchImpl || globalThis.fetch;

    if (typeof fetchImpl !== "function") {
        throw new Error(
            "This backend requires Node.js 18 or newer with native fetch support."
        );
    }

    const [safeBrowsing, webRisk] = await Promise.all([
        checkGoogleSafeBrowsing(url, safeBrowsingApiKey, fetchImpl),
        checkGoogleWebRisk(url, webRiskApiKey, fetchImpl)
    ]);

    const threatMatches = [
        ...safeBrowsing.threatTypes,
        ...webRisk.threatTypes
    ];

    const uniqueThreatTypes = [...new Set(threatMatches)];

    const confirmedThreat =
        safeBrowsing.match || webRisk.match;

    const configuredChecks = [safeBrowsing, webRisk]
        .filter(check => check.configured);

    const successfulChecks = configuredChecks
        .filter(check => check.status === "success");

    let verificationStatus = "not_configured";

    if (configuredChecks.length === 2 && successfulChecks.length === 2) {
        verificationStatus = "complete";
    } else if (successfulChecks.length > 0) {
        verificationStatus = "partial";
    } else if (configuredChecks.length > 0) {
        verificationStatus = "unavailable";
    }

    const indicators = [...heuristicResult.indicators];

    if (confirmedThreat) {
        indicators.push({
            id: "google-threat-intelligence-match",
            label: `Google threat intelligence match: ${uniqueThreatTypes.join(", ")}`,
            weight: 100,
            source: [
                ...(safeBrowsing.match ? ["Google Safe Browsing"] : []),
                ...(webRisk.match ? ["Google Web Risk"] : [])
            ]
        });
    }

    // A confirmed threat match overrides the heuristic score.
    // A clean API result never reduces the existing heuristic score.
    const score = confirmedThreat
        ? 100
        : heuristicResult.score;

    let riskLevel = "low";

    if (score >= 50) {
        riskLevel = "high";
    } else if (score >= 20) {
        riskLevel = "medium";
    }

    let recommendation;

    if (confirmedThreat) {
        recommendation =
            "This URL matched a known threat in Google's threat intelligence. Do not open it or enter passwords, OTPs or financial information.";
    } else if (heuristicResult.score >= 20) {
        recommendation = heuristicResult.recommendation;
    } else if (verificationStatus === "complete") {
        recommendation =
            "No match was found in the checked Google threat lists and no major heuristic warning was detected. This does not guarantee that the website is safe.";
    } else {
        recommendation =
            "No major heuristic warning was detected, but external threat verification was incomplete. Treat this URL cautiously.";
    }

    return {
        ...heuristicResult,
        status: "hybrid",
        score,
        riskLevel,
        indicators,
        recommendation,
        verification: {
            mode: "hybrid",
            status: verificationStatus,
            confirmedThreat,
            threatTypes: uniqueThreatTypes,
            services: {
                safeBrowsing,
                webRisk
            }
        },
        disclaimer:
            "SFIC combines URL structure heuristics with Google Safe Browsing and Google Web Risk lookups. Threat-list matches are strong warnings. No match does not guarantee safety. External verification may be incomplete if an API is unavailable or not configured."
    };
}

module.exports = {
    analyseURL,
    analyseURLHybrid
};
