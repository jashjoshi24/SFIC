
const { parse } = require("tldts");
const { parse } = require('tldts');

const HIGH_RISK = 60;
const MEDIUM_RISK = 25;

const SHORTENER_DOMAINS = [
    "bit.ly", "tinyurl.com", "t.co", "is.gd",
    "cutt.ly", "shorturl.at", "rb.gy", "ow.ly",
    "tiny.cc"
];

function normalizeText(text) {
    return String(text || "")
        .normalize("NFC")
        .toLowerCase()
        .replace(/[.,!?;:()[\]{}"'`]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractUrls(message) {
    const matches = message.match(
        /(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:t\.me|wa\.me|bit\.ly|tinyurl\.com|rb\.gy|tiny\.cc)\/[^\s<>"']+/gi
    ) || [];

    return [...new Set(
        matches.map(url => url.replace(/[.,!?;:)]+$/g, ""))
    )];
}

function isBankingSuspensionContext(message) {
    const text = normalizeText(message);

    const phrases = [
        "online banking has been suspended",
        "online banking is suspended",
        "banking has been suspended",
        "banking is suspended",
        "bank account has been suspended",
        "bank account is suspended",
        "account has been suspended",
        "account is suspended",
        "account suspended",
        "unlock your account",
        "unlock your banking account",
        "unlock online banking",
        "bank account blocked",
        "banking account blocked",

        // Additional account-blocking phrases
        "account will be blocked",
        "account will be permanently blocked",
        "account permanently blocked",
        "account blocked due to suspicious activity",
        "account will be blocked due to suspicious activity",
        "bank account will be blocked",
        "bank account will be permanently blocked",
        "your account will be blocked",
        "your account will be permanently blocked",
        "your bank account will be blocked",
        "your bank account will be permanently blocked",
        "sbi account will be blocked",
        "sbi account will be permanently blocked",
        "account will be closed",
        "account will be deactivated"
    ];

    return phrases.some(phrase =>
        text.includes(normalizeText(phrase))
    );
}


function analyseUrls(message) {
    const text = normalizeText(message);
    const bankingSuspensionContext =
        isBankingSuspensionContext(message);

function analyseUrls(message) {
    return extractUrls(message).map(url => {
        let parsedUrl;

        try {
            let normalizedUrl = url.trim();

            // Add HTTPS to bare domains extracted by OCR.
            // Examples:
            // www.example.com -> https://www.example.com
            // example.com/path -> https://example.com/path

            if (!/^https?:\/\//i.test(normalizedUrl)) {
                if (/^[a-z][a-z0-9+.-]*:/i.test(normalizedUrl)) {
                    throw new Error("Unsupported URL protocol.");
                }

                normalizedUrl = `https://${normalizedUrl}`;
            }

            parsedUrl = new URL(normalizedUrl);

            if (
                !["http:", "https:"].includes(parsedUrl.protocol) ||
                !parsedUrl.hostname
            ) {
                throw new Error("Invalid URL format.");
            }
            parsedUrl = new URL(
                url.startsWith("www.") ? `https://${url}` :
                /^[a-z0-9.-]+\//i.test(url) && !url.includes("://")
                    ? `https://${url}`
                    : url
            );
        } catch {
            return {
                url,
                hostname: null,
                domain: null,
                reasons: ["Invalid URL format"]
            };
        }

        const hostname = parsedUrl.hostname.toLowerCase();
        const domainInfo = parse(hostname);
        const reasons = [];

        if (SHORTENER_DOMAINS.some(domain =>
            hostname === domain || hostname.endsWith(`.${domain}`)
        )) {
            reasons.push("URL shortener detected");
        }

        if (parsedUrl.protocol === "http:") {
            reasons.push("Insecure HTTP connection");
        }

        if (domainInfo.isIp) {
            reasons.push("URL uses an IP address instead of a domain");
        }

        if (parsedUrl.username || parsedUrl.password) {
            reasons.push("URL contains embedded login credentials");
        }

        const bankingActionTerms = [
            "activation",
            "activate",
            "verification",
            "verify",
            "unlock",
            "secure",
            "update"
        ];

        if (
            bankingSuspensionContext &&
            bankingActionTerms.some(term => hostname.includes(term))
        ) {
            reasons.push(
                "Banking suspension message links to an account activation or verification domain"
            );
        }

        return {
            url,
            hostname,
            domain: domainInfo.domain,
            reasons
        };
    });
}

const rules = [
    {
        id: "otp",
        keywords: [
            "otp", "one time password", "one-time password",
            "ઓટીપી", "વન ટાઈમ પાસવર્ડ"
        ],
        keywords: ["otp", "one time password", "one-time password", "ઓટીપી", "વન ટાઈમ પાસવર્ડ"],
        label: "OTP Request",
        description: "The message appears to request a one-time password.",
        weight: 25
    },
    {
        id: "urgency",
        keywords: [
            "urgent", "immediately", "account blocked",
            "within 24 hours", "suspended today",
            "account suspended", "account freeze",
            "avoid freeze", "will be blocked",
            "will be suspended", "final warning",
            "suspend your account", "freeze your account",
            "aaje ratre", "turant", "turtaj",
            "bandh thai jashe", "block thai jashe",
            "આજે રાત્રે", "તાત્કાલિક", "તરત જ",
            "બંધ થઈ જશે", "બ્લોક થઈ જશે"
        ],
        label: "Urgency or Threat",
        description: "The message uses urgency or threats to pressure the recipient.",
        weight: 22
    },
    {
        id: "banking-suspension",
        keywords: [
            "online banking has been suspended",
            "online banking is suspended",
            "banking has been suspended",
            "banking is suspended",
            "bank account has been suspended",
            "bank account is suspended",
            "account has been suspended",
            "account is suspended",
            "account suspended",
            "unlock your account",
            "unlock your banking account",
            "unlock online banking",
            "bank account blocked",
            "banking account blocked",

            // Additional account-blocking keywords
            "account will be blocked",
            "account will be permanently blocked",
            "account permanently blocked",
            "account blocked due to suspicious activity",
            "account will be blocked due to suspicious activity",
            "bank account will be blocked",
            "bank account will be permanently blocked",
            "your account will be blocked",
            "your account will be permanently blocked",
            "your bank account will be blocked",
            "your bank account will be permanently blocked",
            "sbi account will be blocked",
            "sbi account will be permanently blocked",
            "account will be closed",
            "account will be deactivated"
        ],
        label: "Banking Account Suspension Threat",
        description: "The message claims that online banking or a bank account has been suspended, blocked or deactivated and may pressure the recipient to restore access.",
        weight: 35
    },
    {
        id: "suspicious-login-action",
        keywords: [
            "click here",
            "click the link",
            "click below",
            "login to unlock",
            "log in to unlock",
            "sign in to unlock",
            "verify your account here",
            "activate your account here",
            "unlock your account here",
            "verify now",
            "login now",
            "log in now"
        ],
        label: "Suspicious Account Login or Unlock Link",
        description: "The message directs the recipient to follow a link or log in to resolve a banking account issue.",
        weight: 10
    },
    {
        id: "kyc",
        keywords: [
            "update your kyc", "complete your kyc",
            "kyc expired", "pending kyc", "verify your kyc",
            "kyc update required", "kyc verification required",
            "kyc update", "kyc is pending", "kyc has expired",
            "kyc pending", "update kyc", "kyc bandh",
            "kyc bandh thai jashe", "kyc adhuru",
            "kyc adhuru che", "aadhaar re-validation",
            "biometric re-validation", "pan card is not linked",
            "aadhaar details", "આધાર નંબર અપડેટ",
            "કેવાયસી બાકી", "કેવાયસી અધૂરું",
            "કેવાયસી અપડેટ", "પાન કાર્ડ અપલોડ",

            // Additional KYC request keywords
            "kyc details",
            "your kyc details",
            "reply with your kyc details",
            "submit kyc details",
            "provide your kyc details",
            "update your kyc details",
            "send your kyc details",
            "share your kyc details",
            "submit your kyc",
            "provide kyc details",
            "send kyc details",
            "share kyc details"
            "કેવાયસી અપડેટ", "પાન કાર્ડ અપલોડ"
        ],
        label: "Possible Fake KYC",
        description: "The message contains a KYC or identity verification request.",
        weight: 20
    },
    {
        id: "reward",
        keywords: [
            "lottery", "prize", "won", "reward",
            "lucky draw", "winning amount",
            "claim your winning", "selection fee",
            "ઇનામ જીત્યું", "લોટરી જીતી",
            "ઇનામ મળ્યું", "લકી ડ્રો"
        ],
        label: "Reward or Lottery Claim",
        description: "The message mentions a prize, reward or lottery claim.",
        weight: 18
    },
    {
        id: "digital-arrest",
        keywords: [
            "digital arrest", "police case", "arrest warrant",
            "cyber crime", "cbi officer", "customs officer",
            "narcotics control bureau", "avoid arrest",
            "avoid arrest warrant", "police will come",
            "ધરપકડ", "અરસ્ટ વોરંટ", "પોલીસ કેસ",
            "સાયબર ક્રાઈમ", "સીબીઆઈ"
            "સાયબર ક્રાઈમ", "સીબીઆઈ",
        ],
        label: "Impersonation or Arrest Threat",
        description: "The message contains possible law-enforcement impersonation or arrest threats.",
        weight: 22
    },
    {
        id: "job",
        keywords: [
            "part time job", "work from home",
            "earn daily", "daily income",
            "security deposit", "registration fee",
            "online tasks", "no experience required",
            "refundable deposit", "joining fee",
            "training kit", "review job",
            "data entry", "daily rs", "earn rs",
            "ઘરે બેઠા કામ", "રજીસ્ટ્રેશન ફી",
            "સિક્યોરિટી ડિપોઝિટ", "પેકિંગ કામ",
            "એડવાન્સ",
            "cbi officer",
            "mumbai customs",
            "indian customs",
            "customs department",
            "narcotics control bureau",
            "parcel contains drugs",
            "parcel containing narcotics",
            "confiscated parcel",
            "avoid arrest",
            "case settlement",
            "case khatam",
            "police aavse",
            "ghar par police",
            "police આવશે",
            "કસ્ટમ વિભાગ",
            "નાર્કોટિક્સ",
            "તમારા નામે પાર્સલ",
            "ડ્રગ્સ પકડાયા"
"mumbai customs",
"indian customs",
"customs department",
"narcotics control bureau",
"parcel contains drugs",
"parcel containing narcotics",
"confiscated parcel",
"avoid arrest",
"case settlement",
"case khatam",
"police aavse",
"ghar par police",
"police આવશે",
"કસ્ટમ વિભાગ",
"નાર્કોટિક્સ",
"તમારા નામે પાર્સલ",
"ડ્રગ્સ પકડાયા"
        ],
        label: "Suspicious Job Offer",
        description: "The message contains a job offer with potentially suspicious payment demands.",
        weight: 20
    },
    {
        id: "loan",
        keywords: [
            "loan approved", "processing fee",
            "loan without documents", "instant loan",
            "pay advance fee", "file charges",
            "documentation charges", "disbursal",
            "pre-approved personal loan",
            "loan approval letter", "zero interest",
            "લોન મેળવવા માટે ફી", "પ્રોસેસિંગ ફી",
            "દસ્તાવેજ વગર લોન", "ફાઈલ ચાર્જ",
            "લોન મંજૂર"
        ],
        label: "Suspicious Loan Offer",
        description: "The message contains a loan offer or upfront payment demand.",
        weight: 20
    },
    {
        id: "electricity",
        keywords: [
            "electricity connection will be disconnected",
            "power supply will be disconnected",
            "electricity bill pending",
            "disconnection tonight",
            "connection cut thase",
            "connection kapi nakhashe",
            "light bill baki", "light bill pending",
            "transformer mathi connection",
            "વીજ કનેક્શન કાપી",
            "વીજળી કનેક્શન બંધ",
            "વીજ પુરવઠો બંધ",
            "કનેક્શન કાપી નાખવામાં આવશે",
            "વીજળીનું બિલ અપડેટ"
        ],
        label: "Electricity Disconnection Threat",
        description: "The message uses an electricity disconnection threat to pressure the recipient.",
        weight: 20
    },
    {
        id: "banking",
        keywords: [
            "cvv", "atm pin", "mpin",
            "card number", "account details",
            "bank details", "upi pin",
            "share your pin", "enter your cvv",
            "send your mpin", "card reactivate",
            "credit card limit", "card limit",
            "કાર્ડ નંબર", "સીવીવી", "એટીએમ પિન",
            "પિન મોકલો", "આધાર વિગતો"
        ],
        label: "Sensitive Banking Information Request",
        description: "The message may request sensitive banking or card information.",
        weight: 25
    },
    {
        id: "delivery",
        keywords: [
            "customs fee", "custom tax",
            "redelivery fee", "parcel awaiting delivery",
            "parcel return", "delivery exception",
            "address update", "address is incomplete",
            "parcel clearance", "parcel release",
            "pay to release", "consignment",
            "પાર્સલ અટક્યું", "કસ્ટમ ફી",
            "વજન ચાર્જ", "સરનામું સુધારો",
            "પાર્સલ છોડાવો"
        ],
        label: "Suspicious Delivery Payment",
        description: "The message contains a delivery-related payment or address-update request.",
        weight: 20
    },
    {
        id: "gujarati-otp",
        keywords: [
            "તમારો ઓટીપી જણાવો",
            "તમારો otp જણાવો",
            "ઓટીપી શેર કરો",
            "otp શેર કરો",
            "વન ટાઈમ પાસવર્ડ",
            "otp મોકલો",
            "ઓટીપી મોકલો",
            "otp આપો",
            "ઓટીપી આપો",
            "otp વોટ્સએપ",
            "otp કોઈને આપો"
        ],
        label: "Gujarati OTP Request",
        description: "The message asks the recipient to share an OTP.",
        weight: 25
    },
    {
        id: "gujarati-bank-threat",
        keywords: [
            "તમારું બેંક ખાતું બંધ થઈ જશે",
            "તમારું ખાતું બંધ થઈ જશે",
            "બેંક ખાતું બ્લોક થઈ જશે",
            "ખાતું ફ્રીઝ થઈ જશે",
            "account block થઈ જશે",
            "account બંધ થઈ જશે",
            "તમારું account block થશે",
            "tamaaru bank account bandh thai jashe",
            "tamaro bank account bandh thai jashe",
            "bank account bandh thai jashe",
            "tamaaru account bandh thai jashe",
            "account block thai jashe",
            "bank account block thai jashe",
            "account freeze thai jashe"
        ],
        label: "Gujarati Bank Account Threat",
        description: "The message threatens bank account blocking or suspension.",
        weight: 22
    },
    {
        id: "gujarati-kyc",
        keywords: [
            "તમારું kyc અપડેટ કરો",
            "કેવાયસી અપડેટ કરો",
            "તમારું કેવાયસી પૂર્ણ કરો",
            "કેવાયસી પૂર્ણ કરો",
            "તમારું kyc update કરો",
            "kyc update કરો",
            "kyc pending che",
            "tamaru kyc bandh thai jashe",
            "aadhar details aapo",
            "adhar details aapo"
        ],
        label: "Gujarati KYC Request",
        description: "The message requests KYC updates or identity verification.",
        weight: 20
    },
    {
        id: "gujarati-electricity",
        keywords: [
            "વીજ કનેક્શન કાપી નાખવામાં આવશે",
            "વીજળી કનેક્શન બંધ થઈ જશે",
            "વીજ પુરવઠો બંધ કરવામાં આવશે",
            "વીજ કનેક્શન કાપી નાખશે",
            "વીજળી બંધ કરવાની ચેતવણી",
            "light bill baki che",
            "connection cut thase",
            "connection kapi nakhashe"
        ],
        label: "Gujarati Electricity Threat",
        description: "The message threatens electricity disconnection.",
        weight: 20
    },
    {
        id: "gujarati-lottery",
        keywords: [
            "તમે લોટરી જીતી છે",
            "તમે ઇનામ જીત્યું છે",
            "તમને ઇનામ મળ્યું છે",
            "લાખો રૂપિયા જીત્યા છે",
            "તમારો નંબર પસંદ થયો છે",
            "લોટરી લાગી છે"
        ],
        label: "Gujarati Lottery or Reward",
        description: "The message makes a possible lottery or reward claim.",
        weight: 18
    },
    {
        id: "gujarati-digital-arrest",
        keywords: [
            "ડિજિટલ અરેસ્ટ",
            "તમારી ધરપકડ કરવામાં આવશે",
            "અરસ્ટ વોરંટ",
            "પોલીસ કેસમાં ફસાઈ જશો",
            "ધરપકડથી બચવા",
            "ધરપકડ ટાળવા"
        ],
        label: "Gujarati Digital Arrest Threat",
        description: "The message contains a possible digital arrest threat.",
        weight: 22
    },
    {
        id: "gujarati-loan",
        keywords: [
            "તાત્કાલિક લોન મંજૂર",
            "લોન મેળવવા માટે ફી ભરો",
            "પ્રોસેસિંગ ફી ભરો",
            "દસ્તાવેજ વગર લોન",
            "ફાઈલ ચાર્જ",
            "ગેરંટી વગર લોન"
        ],
        label: "Gujarati Suspicious Loan",
        description: "The message contains a potentially suspicious loan offer.",
        weight: 20
    }
];


function isOtpRequest(text) {
    const warningPatterns = [
        /(?:do not|don't|never|not to)\s+share.{0,60}(?:otp|one time password)/,
        /(?:otp|one time password).{0,60}(?:do not|don't|never)\s+share/,
        /(?:otp|ઓટીપી).{0,60}(?:શેર કરશો નહીં|આપશો નહીં|કોઈને આપશો નહીં)/,
        /(?:કોઈની પણ સાથે|કોઈને પણ).{0,40}(?:શેર કરશો નહીં|આપશો નહીં)/
    ];

    // Explicit warnings should not be interpreted as credential requests.
    if (warningPatterns.some(pattern => pattern.test(text))) {
        return false;
    }

    const requestPatterns = [
        /\b(?:share|send|provide|tell|give|enter|submit|forward)\b.{0,60}\b(?:your\s+)?(?:otp|one time password)\b/,
        /\b(?:otp|one time password)\b.{0,60}\b(?:share|send|provide|tell|give|enter|submit|forward)\b/,
        /\b(?:otp|one time password)\b.{0,60}\b(?:moklo|aapo|janavo|aapjo|lakho|bolo)\b/,
        /\b(?:moklo|aapo|janavo|aapjo|lakho)\b.{0,60}\b(?:otp|one time password)\b/
    ];

    const gujaratiRequest =
        /(?:otp|ઓટીપી|વન ટાઈમ પાસવર્ડ).{0,60}(?:મોકલો|આપો|જણાવો|શેર કરો|વોટ્સએપ)/.test(text) ||
        /(?:મોકલો|આપો|જણાવો|શેર કરો).{0,60}(?:otp|ઓટીપી|વન ટાઈમ પાસવર્ડ)/.test(text);

    return requestPatterns.some(pattern => pattern.test(text)) ||
        gujaratiRequest;
}

function isLegitimateContext(ruleId, text) {
    if (ruleId === "otp" || ruleId === "gujarati-otp") {
        return !isOtpRequest(text);
    }

    if (ruleId === "reward" || ruleId === "gujarati-lottery") {
        return [
            "lottery results",
            "lottery news",
            "announced the lottery",
            "લોટરીના પરિણામ"
        ].some(phrase => text.includes(normalizeText(phrase)));
    }

    if (ruleId === "electricity" || ruleId === "gujarati-electricity") {
        return [
            "કૃપા કરીને સમયસર ચૂકવણી કરો",
            "સમયસર બિલ ચૂકવો",
            "તમારું વીજળી બિલ બાકી છે"
        ].some(phrase => text.includes(normalizeText(phrase)));
    }

    return false;
}


function isAdvancePaymentDemand(text) {
    const paymentTerms =
        /\b(?:registration fee|joining fee|security deposit|refundable deposit|processing fee|documentation charges|file charges|medical test fee|training fee|training kit|customs fee|custom tax|redelivery fee|clearance fee|delivery charges|selection fee|claim fee|government tax|advance fee|stamp paper charges|pay|payment|transfer|deposit|fee|charges)\b|રજીસ્ટ્રેશન ફી|સિક્યોરિટી ડિપોઝિટ|એડવાન્સ|ફી ભરો|ચાર્જ ભરો|પૈસા ભરો|ટ્રાન્સફર કરો|જમા કરો|ભરો/i;

    const paymentActions =
        /\b(?:pay|transfer|send|deposit|submit|collect|claim|release|initiate|start|bharo|moklo|aapo|jama karo)\b|ભરો|મોકલો|આપો|જમા કરો|ટ્રાન્સફર કરો/i;

    const hasPaymentTerm = paymentTerms.test(text);
    const hasPaymentAction = paymentActions.test(text);

    const hasMoneyReference =
        /(?:₹|rs\.?|inr)\s*[\d,]+|\b[\d,]+\s*(?:rupees|rs\.?|inr)\b|upi\s*(?:id)?/i.test(text);

    return hasPaymentTerm && (hasPaymentAction || hasMoneyReference);
}

function getMatchedKeywords(rule, text) {
    const matched = rule.keywords.filter(keyword =>
        text.includes(normalizeText(keyword))
    );

    if (rule.id === "otp" || rule.id === "gujarati-otp") {
        return isOtpRequest(text) ? matched : [];
    }

    // Do not flag login actions unless a banking suspension context exists.
    if (rule.id === "suspicious-login-action") {
        return isBankingSuspensionContext(text) ? matched : [];
    }

    return matched;
}

function isIncidentReport(text) {
    const reportingPatterns = [
        /\b(?:i received|i got|someone called|i received a call|i got a call)\b/,
        /\b(?:i reported|i complained|i immediately disconnected)\b/,
        /મને .* (?:મેસેજ|કોલ) આવ્યો/,
        /મેં .* (?:ફરિયાદ|ફોન બંધ|ફોન કાપી)/,
        /branch ma check karyu/,
        /1930 cyber crime helpline/
    ];

    const hasReportingLanguage = reportingPatterns.some(pattern =>
        pattern.test(text)
    );

    const hasDirectDemand = isOtpRequest(text) ||
        isAdvancePaymentDemand(text);

    return hasReportingLanguage && !hasDirectDemand;
}

function analyseMessage(message) {
    const originalMessage = String(message || "");
    const text = normalizeText(originalMessage);

    const incidentReport = isIncidentReport(text);

    const indicators = rules.map(rule => {
        const matchedKeywords = getMatchedKeywords(rule, text);

        if (
            matchedKeywords.length === 0 ||
            isLegitimateContext(rule.id, text) ||
            (
                incidentReport &&
                [
                    "urgency",
                    "kyc",
                    "digital-arrest",
                    "gujarati-bank-threat"
                ].includes(rule.id)
            )
        ) {
            return null;
        }

        return {
            id: rule.id,
            label: rule.label,
            description: rule.description,
            weight: rule.weight,
            evidence: matchedKeywords
        };
    }).filter(Boolean);

    const advancePaymentCategories = [
        "job",
        "loan",
        "reward",
        "gujarati-lottery",
        "digital-arrest",
        "gujarati-digital-arrest",
        "delivery",
        "kyc",
        "gujarati-kyc"
    ];

    const hasAdvancePaymentContext = indicators.some(item =>
        advancePaymentCategories.includes(item.id)
    );

    if (
        hasAdvancePaymentContext &&
        isAdvancePaymentDemand(text)
    ) {
        indicators.push({
            id: "advance-payment",
            label: "Advance Payment Demand",
            description: "The message combines a suspicious service or offer with a demand for advance payment.",
            weight: 20,
            evidence: [
                "Payment demand detected alongside a suspicious offer or threat"
            ]
        });
    }

const indicators = rules.map(rule => {
    const matchedKeywords = getMatchedKeywords(rule, text);

    if (
        matchedKeywords.length === 0 ||
        isLegitimateContext(rule.id, text) ||
        (incidentReport && [
            "urgency",
            "kyc",
            "digital-arrest",
            "gujarati-bank-threat"
        ].includes(rule.id))
    ) {
        return null;
    }

    return {
        id: rule.id,
        label: rule.label,
        description: rule.description,
        weight: rule.weight,
        evidence: matchedKeywords
    };
}).filter(Boolean);

    const advancePaymentCategories = [
    "job",
    "loan",
    "reward",
    "gujarati-lottery",
    "digital-arrest",
    "gujarati-digital-arrest",
    "delivery",
    "kyc",
    "gujarati-kyc"
];

const hasAdvancePaymentContext = indicators.some(item =>
    advancePaymentCategories.includes(item.id)
);

if (
    hasAdvancePaymentContext &&
    isAdvancePaymentDemand(text)
) {
    indicators.push({
        id: "advance-payment",
        label: "Advance Payment Demand",
        description: "The message combines a suspicious service or offer with a demand for advance payment.",
        weight: 20,
        evidence: ["Payment demand detected alongside a suspicious offer or threat"]
    });
}

    const urlAnalysis = analyseUrls(originalMessage);

    const suspiciousUrls = urlAnalysis.filter(
        item => item.reasons.length > 0
    );

    if (suspiciousUrls.length > 0) {
        indicators.push({
            id: "link",
            label: "Suspicious Link Indicator",
            description: "The message contains URLs with potentially suspicious characteristics.",
            weight: 20,
            evidence: suspiciousUrls.map(item => ({
                url: item.url,
                reasons: item.reasons
            }))
        });
    }

    const baseScore = indicators.reduce(
        (total, item) => total + item.weight,
        0
    );

    const ids = new Set(indicators.map(item => item.id));

    const hasCredentialRequest =
        ids.has("otp") ||
        ids.has("gujarati-otp") ||
        ids.has("banking");

    const hasThreat = [
        "urgency",
        "gujarati-bank-threat",
        "banking-suspension",
        "digital-arrest",
        "gujarati-digital-arrest",
        "electricity",
        "gujarati-electricity"
    ].some(id => ids.has(id));

    const hasSuspiciousLink = ids.has("link");

    const combinations = [];

    if (hasCredentialRequest && hasThreat) {
        combinations.push({
            id: "credential-threat-combination",
            description: "A credential-related indicator appears together with a threat or urgency indicator.",
            additionalWeight: 0
        });
    }

    if (hasCredentialRequest && hasSuspiciousLink) {
        combinations.push({
            id: "credential-link-combination",
            description: "A credential-related indicator appears together with a suspicious URL.",
            additionalWeight: 15
        });
    }

    if (hasThreat && hasSuspiciousLink) {
        combinations.push({
            id: "threat-link-combination",
            description: "A threat or urgency indicator appears together with a suspicious URL.",
            additionalWeight: 10
        });
    }

    const combinationScore = combinations.reduce(
        (total, item) => total + item.additionalWeight,
        0
    );

    const score = Math.min(
        100,
        baseScore + combinationScore
    );
    const score = Math.min(100, baseScore + combinationScore);

    let riskLevel = "safe";

    if (score >= HIGH_RISK) {
        riskLevel = "high";
    } else if (score >= MEDIUM_RISK) {
        riskLevel = "medium";
    }

    return {
        status: "demo",
        score,
        riskLevel,
        indicators,
        urlAnalysis,
        evidence: {
            baseScore,
            combinationScore,
            combinations
        },
        message: "Demo rule-based analysis. Scores indicate configured rule severity, not the probability of fraud."
    };
}

module.exports = {
    analyseMessage
};
module.exports = { analyseMessage };
