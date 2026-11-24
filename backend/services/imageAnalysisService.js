
const sharp = require("sharp");
const jsQR = require("jsqr");
const { createWorker } = require("tesseract.js");
const { parse } = require("tldts");

const { analyseMessage } = require("./messageAnalysisService");
const { analyseURLHybrid } = require("./urlAnalysisService");
const {
    analyseBrandImpersonation
} = require("./brandImpersonationService");

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 25_000_000;

let ocrWorkerPromise = null;

async function getOCRWorker() {
    if (!ocrWorkerPromise) {
        ocrWorkerPromise = createWorker("eng+hin+guj");
    }

    try {
        return await ocrWorkerPromise;
    } catch (error) {
        ocrWorkerPromise = null;
        throw error;
    }
}

/**
 * Repairs common OCR mistakes in URLs.
 */
function repairOCRArtifacts(text) {
    return String(text || "")
        .normalize("NFKC")
        .replace(
            /\b(https?)\s*\\?\s*:\s*\\?\/\s*\\?\/?\s*/gi,
            (_, protocol) => `${protocol.toLowerCase()}://`
        )
        .replace(/(https?:\/\/)\s+/gi, "$1")
        .replace(
            /([a-z0-9-])\.\s+([a-z]{2,})(?=\/|[\s?#]|$)/gi,
            "$1.$2"
        );
}

/**
 * Extracts HTTP/HTTPS URLs and bare domains.
 * Bare domains are validated using the Public Suffix List.
 */
function extractURLs(text) {
    const matches = String(text || "").match(
        /https?:\/\/[^\s<>"']+|(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:\/[^\s<>"']*)?/gi
    ) || [];

    const results = [];

    for (const match of matches) {
        const value = match.replace(/[),.;!?}\]]+$/, "");

        if (!value || value.length > 2048) {
            continue;
        }

        // Explicit HTTP/HTTPS URLs.
        if (/^https?:\/\//i.test(value)) {
            try {
                const parsedURL = new URL(value);

                if (parsedURL.hostname) {
                    results.push(value);
                }
            } catch {
                // Ignore malformed URL candidates.
            }

            continue;
        }

        // Bare domain validation.
        try {
            const parsedURL = new URL(`https://${value}`);

            const domainInfo = parse(parsedURL.hostname, {
                allowPrivateDomains: true
            });

            if (
                domainInfo.domain &&
                (domainInfo.isIcann || domainInfo.isPrivate)
            ) {
                results.push(value);
            }
        } catch {
            // Ignore invalid domain candidates.
        }
    }

    return [...new Set(results)];
}

function getRiskLevel(score) {
    if (score >= 70) return "high";
    if (score >= 30) return "medium";
    return "low";
}

function getSafeScore(result) {
    const score = Number(result?.score);

    return Number.isFinite(score)
        ? Math.max(0, Math.min(100, score))
        : 0;
}

/**
 * Gemini brand analysis should never stop the existing scanner.
 */
async function runBrandAnalysis(messageText, urls) {
    try {
        const result = await analyseBrandImpersonation({
            messageText,
            urls
        });

        return result && typeof result === "object"
            ? result
            : {
                status: "error",
                score: 0,
                assessments: [],
                indicators: [],
                reason: "Invalid brand analysis response."
            };
    } catch (error) {
        console.error(
            "Gemini Brand Analysis Error:",
            error
        );

        return {
            status: "error",
            score: 0,
            assessments: [],
            indicators: [],
            reason: "Gemini brand analysis could not be completed."
        };
    }
}

async function analyseImage(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error("Image data is empty.");
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
        throw new Error("Image exceeds the 15 MB limit.");
    }

    // Validate uploaded image.
    const image = sharp(buffer, {
        limitInputPixels: MAX_IMAGE_PIXELS
    });

    const metadata = await image.metadata();

    if (!["jpeg", "png", "webp"].includes(metadata.format)) {
        throw new Error("Only PNG, JPG and WebP images are supported.");
    }

    if (
        !metadata.width ||
        !metadata.height ||
        metadata.width * metadata.height > MAX_IMAGE_PIXELS
    ) {
        throw new Error("Image dimensions are too large.");
    }

    // Normalize image for QR detection.
    const { data, info } = await sharp(buffer)
        .rotate()
        .resize({
            width: 2000,
            height: 2000,
            fit: "inside",
            withoutEnlargement: true
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Decode QR codes.
    const qrCodes = [];

    const qrResult = jsQR(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
        { inversionAttempts: "attemptBoth" }
    );

    if (qrResult?.data) {
        qrCodes.push({
            data: qrResult.data,
            format: "QR_CODE"
        });
    }

    // OCR text extraction.
    const worker = await getOCRWorker();
    const ocrResult = await worker.recognize(buffer);

    const extractedText = (
        ocrResult?.data?.text || ""
    ).trim().slice(0, 10000);

    // Include QR content in analysis.
    const qrText = qrCodes
        .map(item => item.data)
        .join("\n");

    const combinedText = [
        extractedText,
        qrText
    ].filter(Boolean).join("\n");

    // Repair OCR mistakes.
    const analysisText = repairOCRArtifacts(combinedText);

    // Message analysis.
    const messageResult = analysisText
        ? analyseMessage(analysisText)
        : {
            score: 0,
            riskLevel: "safe",
            indicators: [],
            status: "demo",
            urlAnalysis: [],
            evidence: {
                baseScore: 0,
                combinationScore: 0,
                combinations: []
            }
        };

    // Extract URLs.
    const extractedURLs = extractURLs(analysisText);

    // Hybrid URL analysis.
    const urlResults = [];

    for (const url of extractedURLs.slice(0, 5)) {
        try {
            const result = await analyseURLHybrid(url);

            urlResults.push({
                url,
                result
            });
        } catch (error) {
            console.error(
                "Image URL analysis error:",
                error.message
            );

            urlResults.push({
                url,
                result: {
                    score: 0,
                    riskLevel: "low",
                    status: "unverified",
                    indicators: [],
                    error: "URL verification could not be completed."
                }
            });
        }
    }

    // Gemini brand impersonation analysis.
    // Failure here will not interrupt OCR or URL scanning.
    const brandAnalysis = await runBrandAnalysis(
        analysisText,
        extractedURLs
    );

    // Combine all scores.
    const scores = [
        getSafeScore(messageResult),
        ...urlResults.map(item =>
            getSafeScore(item.result)
        ),
        getSafeScore(brandAnalysis)
    ];

    const finalScore = Math.max(...scores);

    // Combine indicators from all analysis services.
    const indicators = [
        ...(messageResult.indicators || []).map(item => ({
            ...item,
            source: "ocr"
        })),

        ...urlResults.flatMap(item =>
            (item.result.indicators || []).map(indicator => ({
                ...indicator,
                source: "url",
                detectedURL: item.url
            }))
        ),

        ...(brandAnalysis?.indicators || []).map(indicator => ({
            ...indicator,
            source: "brand-analysis"
        }))
    ];

    const hasURL = extractedURLs.length > 0;

    return {
        score: finalScore,
        riskLevel: getRiskLevel(finalScore),
        status: hasURL ? "hybrid" : "ocr",
        indicators,
        extractedText,
        qrCodes,
        extractedURLs,
        messageAnalysis: messageResult,
        urlAnalysis: urlResults,
        brandAnalysis,
        image: {
            format: metadata.format,
            width: metadata.width,
            height: metadata.height
        }
    };
}

module.exports = {
    analyseImage
};
