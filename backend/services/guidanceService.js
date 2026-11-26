
const knowledgeBase = require("../data/guidanceKnowledgeBase.json");

const indicatorCategoryMap = {
    // OTP and banking
    otp: "otp",
    banking: "otp",

    // Banking phishing
    "banking-suspension": "banking_phishing",
    "suspicious-login-action": "banking_phishing",

    // KYC fraud
    kyc: "kyc",
    aadhaar: "kyc",

    // Job and task scams
    job: "job",
    task: "job",

    // Loan and advance-fee scams
    loan: "loan",
    "advance-payment": "loan",
    advance_fee: "loan",

    // Lottery and prize scams
    lottery: "lottery",
    prize: "lottery",

    // Digital arrest and impersonation
    "digital-arrest": "digital_arrest",
    digital_arrest: "digital_arrest",
    impersonation: "digital_arrest",

    // URL and website threats
    link: "url",
    "insecure-http-connection": "url",
    "possible-hdfc-brand-impersonation": "url"
};

// Remove duplicate values while preserving their original order.
function uniqueItems(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    const seen = new Set();

    return items.filter(item => {
        const key = typeof item === "string"
            ? item.trim().toLowerCase()
            : JSON.stringify(item);

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

// Generate appropriate safety guidance from scan results.
function getGuidance(analysis) {

    // 1. Validate analysis input
    if (
        !analysis ||
        typeof analysis !== "object" ||
        !Array.isArray(analysis.indicators)
    ) {
        throw new Error("Invalid analysis result");
    }

    // 2. Identify relevant guidance categories
    const categories = new Set();

    if (analysis.status === "heuristic") {
        // URL heuristic detection
        categories.add("url");
    } else {
        for (const indicator of analysis.indicators) {

            if (!indicator || typeof indicator !== "object") {
                continue;
            }

            const indicatorId = String(
                indicator.id || ""
            ).trim().toLowerCase();

            const category = indicatorCategoryMap[indicatorId];

            if (category) {
                categories.add(category);
            }
        }
    }

    // 3. Fallback guidance
    if (categories.size === 0) {
        categories.add("general");
    }

    // 4. Retrieve matching knowledge-base entries
    const selectedGuidance = [...categories]
        .filter(category => {
            return (
                knowledgeBase[category] &&
                typeof knowledgeBase[category] === "object"
            );
        })
        .map(category => ({
            category,
            ...knowledgeBase[category]
        }));

    // 5. Format guidance sections
    const guidanceSections = selectedGuidance.map(item => ({
        category: item.category,
        title: item.title || "Safety Guidance",
        explanation: item.explanation || "",
        actions: uniqueItems(item.actions),
        precautions: uniqueItems(item.precautions),
        sources: uniqueItems(item.sources)
    }));

    // 6. Return final response
    return {
        riskLevel: analysis.riskLevel ?? "unknown",
        score: analysis.score ?? null,

        disclaimer:
            analysis.status === "heuristic"
                ? "This guidance is based on URL structure and configured detection signals. It does not confirm that a website is fraudulent."
                : "This guidance is based on configured detection signals. It does not confirm that a message is fraudulent.",

        guidance: guidanceSections
    };
}

module.exports = { getGuidance };
