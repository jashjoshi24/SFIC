
const fs = require('node:fs');
const path = require('node:path');

const { analyseMessage } = require('../services/messageAnalysisService');

const datasetPath = path.join(__dirname, '../tests/messageDataset.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

if (!Array.isArray(dataset) || dataset.length === 0) {
    throw new Error('Dataset must be a non-empty array.');
}

const validLabels = ['scam', 'legitimate'];

for (const item of dataset) {
    if (
        typeof item.message !== 'string' ||
        !validLabels.includes(item.expected)
    ) {
        throw new Error(`Invalid dataset entry: ${item.id}`);
    }
}

const results = dataset.map(item => {
    const analysis = analyseMessage(item.message);

    return {
        ...item,
        predicted: analysis.riskLevel === 'safe' ? 'legitimate' : 'scam',
        indicatorDetected: analysis.indicators.length > 0,
        score: analysis.score,
        riskLevel: analysis.riskLevel
    };
});

let TP = 0, TN = 0, FP = 0, FN = 0;

for (const item of results) {
    if (item.expected === 'scam' && item.predicted === 'scam') TP++;
    else if (item.expected === 'legitimate' && item.predicted === 'legitimate') TN++;
    else if (item.expected === 'legitimate' && item.predicted === 'scam') FP++;
    else if (item.expected === 'scam' && item.predicted === 'legitimate') FN++;
}

const percentage = (value, total) =>
    total === 0 ? 'N/A' : `${((value / total) * 100).toFixed(2)}%`;

const total = results.length;
const indicatorMatches = results.filter(x => x.indicatorDetected).length;

console.log('\n========== SFIC DATASET EVALUATION ==========\n');

console.log(`Total messages: ${total}`);
console.log(`Scam messages: ${results.filter(x => x.expected === 'scam').length}`);
console.log(`Legitimate messages: ${results.filter(x => x.expected === 'legitimate').length}`);

console.log('\n--------------- CONFUSION MATRIX ----------------');
console.log(`True Positives: ${TP}`);
console.log(`True Negatives: ${TN}`);
console.log(`False Positives: ${FP}`);
console.log(`False Negatives: ${FN}`);

console.log('\n--------------- METRICS ----------------');
console.log(`Accuracy: ${percentage(TP + TN, total)}`);
console.log(`Precision: ${percentage(TP, TP + FP)}`);
console.log(`Recall: ${percentage(TP, TP + FN)}`);
console.log(`False Positive Rate: ${percentage(FP, FP + TN)}`);
console.log(`False Negative Rate: ${percentage(FN, FN + TP)}`);

console.log('\n---------- RULE MATCH DIAGNOSTIC ----------');
console.log(`Messages with indicators: ${indicatorMatches}/${total}`);

const lowRiskScamMatches = results.filter(
    x => x.expected === 'scam' &&
         x.indicatorDetected &&
         x.predicted === 'legitimate'
);

console.log(`Scam messages with indicators but classified safe: ${lowRiskScamMatches.length}`);

console.log('\n--------------- MISCLASSIFIED MESSAGES ----------------');

const errors = results.filter(x => x.expected !== x.predicted);

if (errors.length === 0) {
    console.log('No misclassified messages.');
} else {
    for (const item of errors) {
        console.log(`ID: ${item.id}`);
        console.log(`Expected: ${item.expected}`);
        console.log(`Predicted: ${item.predicted}`);
        console.log(`Score: ${item.score}`);
        console.log(`Risk: ${item.riskLevel}`);
        console.log(`Category: ${item.category || 'Unspecified'}`);
        console.log(`Message: ${item.message}`);
        console.log('--------------------------------');
    }
}

console.log('\n============================================\n');
