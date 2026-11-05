
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

function isDomainMatch(hostname, domains) {
    return domains.some(domain =>
        hostname === domain || hostname.endsWith(`.${domain}`)
    );
}

function analyseURL(input) {
    if (typeof input !== "string" || !input.trim()) {
        throw new Error("Please provide a URL.");
    }

    const rawUrl = input.trim();

    if (rawUrl.length > 2048) {
        throw new Error("URL exceeds the 2048 character limit.");
    }

    if (/[\s\u0000-\u001F\u007F]/.test(rawUrl)) {
        throw new Error("URL contains invalid characters.");
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
        throw new Error("Only HTTP and HTTPS URLs are supported.");
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

    // Detect a brand name in a domain that does not match its official domain.
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

    // Keywords are weak signals. They must not independently imply phishing.
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
        if (reason.startsWith("Possible ") &&
            reason.endsWith(" brand impersonation")) {
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

module.exports = { analyseURL };
