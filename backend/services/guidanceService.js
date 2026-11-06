const knowledgeBase = require("../data/guidanceKnowledgeBase.json");

const indicatorCategoryMap = {
    otp: "otp",
    banking: "otp",

    "banking-suspension": "banking_phishing",
    "suspicious-login-action": "banking_phishing",

    kyc: "kyc",
    aadhaar: "kyc",

    job: "job",
    task: "job",

    loan: "loan",
    "advance-payment": "loan",
    advance_fee: "loan",

    lottery: "lottery",
    prize: "lottery",

    "digital-arrest": "digital_arrest",
    digital_arrest: "digital_arrest",
    impersonation: "digital_arrest",

    link: "url",
    "insecure-http-connection": "url",
    "possible-hdfc-brand-impersonation": "url"
};

function uniqueItems(items) {
    const seen = new Set();

    return items.filter(item => {
        const key = typeof item === "string"
            ? item.trim().toLowerCase()
            : JSON.stringify(item);

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
    });
}

function getGuidance(analysis) {
    if (!analysis || !Array.isArray(analysis.indicators)) {
        throw new Error("Invalid analysis result");
    }

    const categories = new Set();

    if (analysis.status === "heuristic") {
        categories.add("url");
    } else {
        for (const indicator of analysis.indicators) {
            const indicatorId = String(indicator.id || "").toLowerCase();
            const category = indicatorCategoryMap[indicatorId];

            if (category) {
                categories.add(category);
            }
        }
    }

    if (categories.size === 0) {
        categories.add("general");
    }

    const selectedGuidance = [...categories]
        .filter(category => knowledgeBase[category])
        .map(category => ({
            category,
            ...knowledgeBase[category]
        }));

    const guidanceSections = selectedGuidance.map(item => ({
        category: item.category,
        title: item.title,
        explanation: item.explanation,
        actions: uniqueItems(item.actions || []),
        precautions: uniqueItems(item.precautions || []),
        sources: uniqueItems(item.sources || [])
    }));

    return {
        riskLevel: analysis.riskLevel,
        score: analysis.score,

        disclaimer:
            analysis.status === "heuristic"
                ? "This guidance is based on URL structure and configured detection signals. It does not confirm that a website is fraudulent."
                : "This is guidance based on configured detection signals. It does not confirm that a message is fraudulent.",

        guidance: guidanceSections
    };
}

module.exports = { getGuidance };

const knowledgeBase = require("../data/guidanceKnowledgeBase.json");

const indicatorCategoryMap = {
  otp: "otp",
  banking: "otp",

  kyc: "kyc",
  aadhaar: "kyc",

  job: "job",
  task: "job",

  loan: "loan",
  "advance-payment": "loan",
  advance_fee: "loan",

  lottery: "lottery",
  prize: "lottery",

  "digital-arrest": "digital_arrest",
  digital_arrest: "digital_arrest",
  impersonation: "digital_arrest"
};

function uniqueItems(items) {
  const seen = new Set();

  return items.filter(item => {
    const key = typeof item === "string"
      ? item.trim().toLowerCase()
      : JSON.stringify(item);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getGuidance(analysis) {
  if (!analysis || !Array.isArray(analysis.indicators)) {
    throw new Error("Invalid analysis result");
  }

  const categories = new Set();

  if (analysis.status === "heuristic") {
    categories.add("url");
  } else {
    for (const indicator of analysis.indicators) {
      const indicatorId = String(indicator.id || "").toLowerCase();
      const category = indicatorCategoryMap[indicatorId];

      if (category) {
        categories.add(category);
      }
    }
  }

  if (categories.size === 0) {
    categories.add("general");
  }

  const selectedGuidance = [...categories]
    .filter(category => knowledgeBase[category])
    .map(category => ({
      category,
      ...knowledgeBase[category]
    }));

  const guidanceSections = selectedGuidance.map(item => ({
  category: item.category,
  title: item.title,
  explanation: item.explanation,
  actions: uniqueItems(item.actions || []),
  precautions: uniqueItems(item.precautions || []),
  sources: uniqueItems(item.sources || [])
}));

  return {
  riskLevel: analysis.riskLevel,
  score: analysis.score,

  disclaimer:
    analysis.status === "heuristic"
      ? "This guidance is based on URL structure and configured detection signals. It does not confirm that a website is fraudulent."
      : "This is guidance based on configured detection signals. It does not confirm that a message is fraudulent.",

  guidance: guidanceSections
};
}

module.exports = { getGuidance };
