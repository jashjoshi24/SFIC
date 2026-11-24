const test = require('node:test');
const assert = require('node:assert/strict');

const { analyseMessage } = require('../services/messageAnalysisService');

test('Empty message should return zero score', () => {
    const result = analyseMessage('');

    assert.equal(result.score, 0);
    assert.equal(result.riskLevel, 'safe');
    assert.deepEqual(result.indicators, []);
});

test('Fake KYC message should detect KYC, OTP, urgency, and suspicious link', () => {
    const message ='Your bank account will be blocked. Update your KYC immediately. Share OTP and click here https://bank-verification.com';
    const result = analyseMessage(message);

    assert.equal(result.riskLevel, 'high');
    assert.equal(result.score, 100);

    const indicatorIds = result.indicators.map(item => item.id);

    assert.ok(indicatorIds.includes('otp'));
    assert.ok(indicatorIds.includes('link'));
    assert.ok(result.indicators.length >= 3);
});

test('Job scam message should detect suspicious job offer', () => {
    const message =
        'Work from home and earn daily income. Pay a security deposit to start.';

    const result = analyseMessage(message);

    assert.ok(result.indicators.some(item => item.id === 'job'));
    assert.ok(result.score > 0);
});

test('Loan scam message should detect suspicious loan offer', () => {
    const message =
        'Instant loan approved. Pay processing fee to receive your loan.';

    const result = analyseMessage(message);

    assert.ok(result.indicators.some(item => item.id === 'loan'));
    assert.ok(result.score > 0);
});

test('Digital arrest message should detect relevant indicators', () => {
    const message =
        'You are under digital arrest. An arrest warrant will be issued.';

    const result = analyseMessage(message);

    assert.ok(
        result.indicators.some(item => item.id === 'digital-arrest')
    );
});

test('Repeated OTP keywords without a sharing request should not trigger OTP theft detection', () => {
    const message = 'OTP OTP OTP one time password';

    const result = analyseMessage(message);

    assert.equal(result.score, 0);
    assert.equal(
        result.indicators.some(item => item.id === 'otp'),
        false
    );
});

test('Score should never exceed 100', () => {
    const message =
        'OTP urgent KYC click here https://fake.com lottery digital arrest work from home instant loan';

    const result = analyseMessage(message);

    assert.ok(result.score <= 100);
});

test('Analysis should return the expected response structure', () => {
    const result = analyseMessage('Update your KYC immediately');

    assert.equal(typeof result.score, 'number');
    assert.equal(typeof result.riskLevel, 'string');
    assert.ok(Array.isArray(result.indicators));
    assert.equal(typeof result.status, 'string');
});

test('Genuine bank notification with a link should not be classified as high risk', () => {
    const message =
        'Your monthly bank statement is available. View it at https://bank.example.com';

    const result = analyseMessage(message);

    assert.notEqual(result.riskLevel, 'high');
});

test('Message without known scam keywords should return no indicators', () => {
    const message =
        'Your appointment is confirmed for tomorrow at 10 AM.';

    const result = analyseMessage(message);

    assert.equal(result.score, 0);
    assert.deepEqual(result.indicators, []);
});

test('Electricity disconnection threat should be detected', () => {
    const message =
        'Your electricity connection will be disconnected tonight due to pending electricity bill.';

    const result = analyseMessage(message);

    assert.ok(result.indicators.some(item => item.id === 'electricity'));
});

test('A normal HTTPS bank link should not trigger suspicious link indicator', () => {
    const message =
        'Your bank statement is available at https://bank.example.com';

    const result = analyseMessage(message);

    assert.equal(
        result.indicators.some(item => item.id === 'link'),
        false
    );
});

test('Shortened URL should trigger suspicious link indicator', () => {
    const result = analyseMessage(
        'Claim your reward now https://bit.ly/abc123'
    );

    assert.ok(result.indicators.some(item => item.id === 'link'));
    assert.ok(
        result.urlAnalysis[0].reasons.includes('URL shortener detected')
    );
});

test('HTTP URL should trigger insecure connection warning', () => {
    const result = analyseMessage(
        'Visit http://example.com to verify your account'
    );

    assert.ok(result.indicators.some(item => item.id === 'link'));
    assert.ok(
        result.urlAnalysis[0].reasons.includes('Insecure HTTP connection')
    );
});

test('IP address URL should be detected', () => {
    const result = analyseMessage(
        'Visit https://192.168.1.1/login'
    );

    assert.ok(
        result.urlAnalysis[0].reasons.includes(
            'URL uses an IP address instead of a domain'
        )
    );
});

test('Normal HTTPS URL should not generate URL warnings', () => {
    const result = analyseMessage(
        'Visit https://google.com for more information'
    );

    assert.deepEqual(result.urlAnalysis[0].reasons, []);
    assert.equal(
        result.indicators.some(item => item.id === 'link'),
        false
    );
});

test('Gujarati OTP scam should be detected', () => {
    const result = analyseMessage(
        'તમારો ઓટીપી જણાવો અને તમારો વન ટાઈમ પાસવર્ડ શેર કરો'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-otp')
    );
});

test('Gujarati bank account threat should be detected', () => {
    const result = analyseMessage(
        'તમારું બેંક ખાતું બંધ થઈ જશે. તાત્કાલિક કાર્યવાહી કરો.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-bank-threat')
    );
});

test('Gujarati fake KYC message should be detected', () => {
    const result = analyseMessage(
        'તમારું KYC અપડેટ કરો અને તમારું કેવાયસી પૂર્ણ કરો.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-kyc')
    );
});

test('Gujarati electricity disconnection threat should be detected', () => {
    const result = analyseMessage(
        'તમારું વીજ કનેક્શન કાપી નાખવામાં આવશે. વીજળી બિલ બાકી છે.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-electricity')
    );
});

test('Gujarati lottery scam should be detected', () => {
    const result = analyseMessage(
        'અભિનંદન! તમે લોટરી જીતી છે. તમે ઇનામ જીત્યું છે.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-lottery')
    );
});

test('Gujarati digital arrest threat should be detected', () => {
    const result = analyseMessage(
        'તમારા પર ડિજિટલ અરેસ્ટનો કેસ છે. તમારી ધરપકડ કરવામાં આવશે.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-digital-arrest')
    );
});

test('Gujarati suspicious loan offer should be detected', () => {
    const result = analyseMessage(
        'તમને તાત્કાલિક લોન મંજૂર થઈ છે. લોન મેળવવા માટે ફી ભરો.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-loan')
    );
});

test('Mixed Gujarati-English OTP scam should be detected', () => {
    const result = analyseMessage(
        'તમારો OTP શેર કરો નહીં તો તમારું account block થઈ જશે.'
    );

    assert.ok(result.indicators.some(item => item.id === 'gujarati-otp'));
    assert.ok(result.indicators.some(item => item.id === 'gujarati-bank-threat'));
});

test('Mixed Gujarati-English KYC scam should be detected', () => {
    const result = analyseMessage(
        'તમારું KYC update કરો નહીં તો account બંધ થઈ જશે.'
    );

    assert.ok(result.indicators.some(item => item.id === 'gujarati-kyc'));
});

test('Normal mixed Gujarati-English message should not trigger scam indicators', () => {
    const result = analyseMessage(
        'નમસ્તે, તમારી meeting આવતીકાલે સવારે ૧૦ વાગ્યે છે.'
    );

    assert.equal(result.score, 0);
    assert.equal(result.indicators.length, 0);
});

test('Gujarati OTP detection should work with punctuation', () => {
    const result = analyseMessage(
        'તમારો ઓટીપી જણાવો!!!'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-otp')
    );
});

test('Gujarati KYC detection should work with extra spaces', () => {
    const result = analyseMessage(
        'તમારું   kyc   અપડેટ   કરો'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-kyc')
    );
});

test('English OTP detection should work with mixed casing', () => {
    const result = analyseMessage(
        'Please SHARE your OTP immediately.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'otp')
    );
});

test('Normal OTP notification should not automatically be classified as fraud', () => {
    const result = analyseMessage(
        'Your OTP is 123456. Do not share it with anyone.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'otp'),
        false
    );
});

test('Normal lottery news should not trigger a scam indicator', () => {
    const result = analyseMessage(
        'The government announced the lottery results today.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'reward'),
        false
    );
});

test('Normal job notification should not trigger a scam indicator', () => {
    const result = analyseMessage(
        'Your job interview is scheduled for tomorrow.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'job'),
        false
    );
});

test('Normal Gujarati bank message should not trigger a scam indicator', () => {
    const result = analyseMessage(
        'તમારું બેંક ખાતું સફળતાપૂર્વક અપડેટ કરવામાં આવ્યું છે.'
    );

    assert.equal(result.score, 0);
});

test('Normal Gujarati electricity bill reminder should not trigger a threat', () => {
    const result = analyseMessage(
        'તમારું વીજળી બિલ બાકી છે. કૃપા કરીને સમયસર ચૂકવણી કરો.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'gujarati-electricity'),
        false
    );
});
test('OTP warning should not be treated as an OTP theft request', () => {
    const result = analyseMessage(
        'Never share your OTP with anyone.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'otp'),
        false
    );
});

test('OTP sharing request should be detected', () => {
    const result = analyseMessage(
        'Share your OTP immediately to prevent account suspension.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'otp')
    );
});

test('KYC update with suspicious link should be detected', () => {
    const result = analyseMessage(
        'Update your KYC immediately using this link: http://example.com'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'kyc')
    );

    assert.ok(
        result.indicators.some(item => item.id === 'link')
    );
});

test('Normal KYC information should not automatically indicate fraud', () => {
    const result = analyseMessage(
        'Your KYC verification was successfully completed.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'kyc'),
        false
    );
});

test('Legitimate OTP warning with a number should not trigger OTP theft detection', () => {
    const result = analyseMessage(
        'Your OTP is 123456. Never share it with anyone.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'otp'),
        false
    );
});

test('Urgent message without a known scam pattern should not be automatically flagged', () => {
    const result = analyseMessage(
        'Please complete your application before the deadline tomorrow.'
    );

    assert.equal(result.indicators.length, 0);
});

test('A legitimate bank OTP warning should not trigger OTP theft detection', () => {
    const result = analyseMessage(
        'Your bank OTP is 456789. Do not share it with anyone.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'otp'),
        false
    );
});

test('Scam message using a shortened link should detect link risk', () => {
    const result = analyseMessage(
        'Your account will be blocked today. Update your details here: https://bit.ly/example'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'link')
    );
});

test('Gujarati message asking for OTP should be detected', () => {
    const result = analyseMessage(
        'તમારું ખાતું બંધ થઈ જશે. તમારો ઓટીપી જણાવો.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-otp')
    );
});


test('Gujarati-English transliterated scam should detect OTP and bank threat', () => {
    const result = analyseMessage(
        'Tamaaru bank account bandh thai jashe. OTP moklo.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'otp')
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-bank-threat')
    );
});

test('Closing my bank account should not trigger a bank threat', () => {
    const result = analyseMessage(
        'Mare bank account bandh karavu chhe.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'gujarati-bank-threat'),
        false
    );
});

test('Already closed bank account should not trigger a bank threat', () => {
    const result = analyseMessage(
        'Bank account bandh thai gayu chhe.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'gujarati-bank-threat'),
        false
    );
});

test('Threatening bank account closure with OTP request should be detected', () => {
    const result = analyseMessage(
        'Tamaaru bank account bandh thai jashe. OTP moklo.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'gujarati-bank-threat')
    );

    assert.ok(
        result.indicators.some(item => item.id === 'otp')
    );
});

test('OTP request with indirect wording should be detected', () => {
    const result = analyseMessage(
        'To complete verification, enter your OTP here.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'otp')
    );
});

test('OTP request with transliterated Gujarati should be detected', () => {
    const result = analyseMessage(
        'Tamaro OTP mane moklo.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'otp')
    );
});

test('Legitimate message mentioning OTP without requesting it should not trigger OTP detection', () => {
    const result = analyseMessage(
        'Your OTP was generated successfully for your transaction.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'otp'),
        false
    );
});

test('A normal job advertisement should not automatically trigger a scam indicator', () => {
    const result = analyseMessage(
        'We are hiring software developers. Apply through our official careers page.'
    );

    assert.equal(
        result.indicators.some(item => item.id === 'job'),
        false
    );
});

test('A suspicious KYC message with an account threat should detect multiple indicators', () => {
    const result = analyseMessage(
        'Your KYC has expired. Your account will be blocked. Update your KYC immediately.'
    );

    assert.ok(
        result.indicators.some(item => item.id === 'kyc')
    );

    assert.ok(
        result.indicators.some(item => item.id === 'urgency')
    );
});