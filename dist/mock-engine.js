/**
 * Surakshit Gujarat — Mock Analysis Engine
 * Deterministic scam analysis for:
 * 1. Messages / Calls (SMS, WhatsApp, Telegram)
 * 2. URLs / Websites
 * 3. QR Codes & Image Screenshots
 * 4. Cyber Complaint Draft Generator (1930 / cybercrime.gov.in)
 */
(function () {
  'use strict';

  function getActiveLang() {
    return (window.SG && window.SG.lang) ? window.SG.lang() : (localStorage.getItem('sg_lang') || 'gu');
  }

  /* ─────────────────── 1. MESSAGE RULES & ANALYZER ─────────────────── */
  const MSG_RULES = [
    {
      weight: 25,
      id: 'otp_demand',
      pattern: /otp|one\s*time\s*password|ओટીપી|ઓ\.ટી\.પી|ओटीपी|पिन|pin\b/i,
      label: {
        gu: 'OTP / PIN માંગણી (ગંભીર સાયબર જોખમ)',
        hi: 'OTP / PIN की माँग (गंभीर साइबर जोखिम)',
        en: 'OTP / PIN Request (High Cyber Risk)'
      },
      desc: {
        gu: 'કોઈપણ સત્તાવાર બેંક કે અધિકારી ક્યારેય ફોન કે મેસેજ પર OTP અથવા PIN માંગતા નથી.',
        hi: 'कोई भी आधिकारिक बैंक या अधिकारी कभी फोन या मैसेज पर OTP या PIN नहीं मांगता।',
        en: 'No official bank or authority ever asks for OTP or PIN over message/call.'
      }
    },
    {
      weight: 22,
      id: 'urgency_threat',
      pattern: /suspend|block|freeze|deactivat|बंद|કાપી|બંધ|disfunct|24\s*hours|urgent|immediately|તાત્કાલિક|तुरंत|रात|આજે\s*રાત્રે/i,
      label: {
        gu: 'કટોકટી અને ડરાવવાની યુક્તિ (Urgency & Threat Tactic)',
        hi: 'आपातकाल और डराने की रणनीति (Urgency & Threat Tactic)',
        en: 'Urgency & Intimidation Tactic'
      },
      desc: {
        gu: 'ખાતું કે વીજળી બંધ થવાનો તાત્કાલિક ડર બતાવી વિચારવાનો સમય ન આપવો એ સામાન્ય ફ્રોડ પદ્ધતિ છે.',
        hi: 'खाता या बिजली बंद होने का तत्काल डर दिखाकर सोचने का समय न देना आम धोखाधड़ी का तरीका है।',
        en: 'Creating panic about account suspension or power cut to force hasty action is a classic fraud technique.'
      }
    },
    {
      weight: 20,
      id: 'fake_kyc',
      pattern: /kyc|k\.y\.c|pan\s*card|aadhar|aadhaar|કેવાયસી|પાન\s*કાર્ડ|केवाईसी|पैन\s*कार्ड/i,
      label: {
        gu: 'બનાવતી KYC / PAN અપડેટ બહાનું (Fake KYC Pretext)',
        hi: 'फर्जी KYC / PAN अपडेट बहाना (Fake KYC Pretext)',
        en: 'Fake KYC / PAN Update Pretext'
      },
      desc: {
        gu: 'RBI નિયમ અનુસાર મેસેજમાં આવેલી અજાણી લિંક દ્વારા PAN કે KYC અપડેટ થતું નથી.',
        hi: 'RBI नियमों के अनुसार मैसेज में आए अज्ञात लिंक से PAN या KYC अपडेट नहीं होता।',
        en: 'Under RBI regulations, KYC/PAN updates are never conducted via unsolicited links in SMS/WhatsApp.'
      }
    },
    {
      weight: 20,
      id: 'suspicious_link',
      pattern: /https?:\/\/|bit\.ly|tinyurl|\.xyz|\.top|\.cc|\.tk|\.apk|\.ru|\.link/i,
      label: {
        gu: 'શંકાસ્પદ કે અજાણી શોર્ટનર લિંક (Phishing / APK Link)',
        hi: 'संदिग्ध या शॉर्टनर लिंक (Phishing / APK Link)',
        en: 'Suspicious or Shortened Link (Phishing / APK)'
      },
      desc: {
        gu: 'મેસેજમાં રહેલી લિંક નકલી ફિશિંગ પોર્ટલ કે ખતરનાક APK માલવેર ડાઉનલોડ કરાવી શકે છે.',
        hi: 'मैसेज में मौजूद लिंक नकली फ़िशिंग पोर्टल या खतरनाक APK मैलवेयर डाउनलोड करवा सकता है।',
        en: 'The link in the message may lead to credential harvesting phishing pages or malicious APK downloads.'
      }
    },
    {
      weight: 18,
      id: 'lottery_reward',
      pattern: /lottery|kbc|won|winner|lakh|crore|prize|cashback|reward|લોટરી|ઇનામ|લાખ|लॉटरी|इनाम|रुपये\s*जीते/i,
      label: {
        gu: 'નકલી લોટરી, ઈનામ કે કેશબેક લાલચ (Lottery / Prize Bait)',
        hi: 'फर्जी लॉटरी, इनाम या कैशबैक लालच (Lottery / Prize Bait)',
        en: 'Fake Lottery, Prize or Cashback Bait'
      },
      desc: {
        gu: 'કોઈપણ ખરીદી કે ટિકિટ વગર અજાણ્યા સ્ત્રોત તરફથી પૈસા કે લોટરી જીતવાનો દાવો 100% બનાવટી હોય છે.',
        hi: 'बिना लॉटरी टिकट खरीदे किसी भी अनजान स्रोत से इनाम या लॉटरी जीतने का दावा 100% फर्जी होता है।',
        en: 'Claims of winning lotteries or prizes without buying tickets are standard advance-fee fraud lures.'
      }
    },
    {
      weight: 18,
      id: 'digital_arrest',
      pattern: /digital\s*arrest|cbi|police|customs|crime\s*branch|skype|ડિજિટલ\s*અરેસ્ટ|પોલીસ|સીબીઆઈ|डिजिटल\s*अरेस्ट|सीबीआई|वारंट/i,
      label: {
        gu: 'ડિજિટલ અરેસ્ટ / પોલીસ ધમકી (Digital Arrest Extortion)',
        hi: 'डिजिटल अरेस्ट / पुलिस धमकी (Digital Arrest Extortion)',
        en: 'Digital Arrest / Law Enforcement Impersonation'
      },
      desc: {
        gu: 'પોલીસ કે સીબીઆઇ ક્યારેય વોટ્સએપ કે સ્કાયપે વિડીયો કોલ દ્વારા ધરપકડ કે પૈસાની માંગણી કરતી નથી.',
        hi: 'पुलिस या सीबीआई कभी व्हाट्सएप या स्काइप वीडियो कॉल पर गिरफ्तारी या पैसों की मांग नहीं करती।',
        en: 'Police, CBI, or ED never conduct arrests or demand money transfers over WhatsApp or Skype video calls.'
      }
    },
    {
      weight: 16,
      id: 'part_time_job',
      pattern: /part\s*time|work\s*from\s*home|daily\s*(earn|5000|2000)|youtube\s*like|telegram|પાર્ટ\s*ટાઇમ|લાઈક|पार्ट\s*टाइम/i,
      label: {
        gu: 'પાર્ટ-ટાઇમ જોબ / YouTube લાઈક કૌભાંડ (Pig Butchering)',
        hi: 'पार्ट-टाइम जॉब / YouTube लाइक घोटाला (Pig Butchering)',
        en: 'Part-Time Job / Video Like Scam (Task Fraud)'
      },
      desc: {
        gu: 'શરૂઆતમાં ₹150-200 આપી વિશ્વાસ જીત્યા પછી મોટું પ્રિપેડ ઇન્વેસ્ટમેન્ટ માંગી નાણાં પડાવવામાં આવે છે.',
        hi: 'शुरुआत में ₹150-200 देकर विश्वास जीतने के बाद बड़े निवेश के नाम पर धोखाधड़ी की जाती है।',
        en: 'Small initial payouts are used to gain trust before demanding large deposits for "VIP prepaid tasks".'
      }
    },
    {
      weight: 15,
      id: 'foreign_origin',
      pattern: /\+62|\+84|\+234|\+855|\+1\s?876|\+92|\+212/i,
      label: {
        gu: 'અજાણ્યો વિદેશી દેશનો કોડ (+62, +84, +234, +92)',
        hi: 'अज्ञात विदेशी देश कोड (+62, +84, +234, +92)',
        en: 'Foreign Country Calling Code (+62, +84, +234, etc.)'
      },
      desc: {
        gu: 'આંતરરાષ્ટ્રીય વર્ચ્યુઅલ નંબરોથી મોકલાતા સ્થાનિક મેસેજ સાયબર સિન્ડિકેટ દ્વારા સંચાલિત હોય છે.',
        hi: 'अंतरराष्ट्रीय वर्चुअल नंबरों से भेजे जाने वाले स्थानीय संदेश साइबर सिंडिकेट द्वारा चलाए जाते हैं।',
        en: 'Messages originating from offshore VoIP virtual numbers often hide overseas cyber syndicates.'
      }
    }
  ];

  function analyseMessage(text) {
    if (!text || !text.trim()) {
      return {
        score: 0,
        riskLevel: 'safe',
        riskLabel: { gu: 'ખાલી સંદેશ', hi: 'खाली संदेश', en: 'Empty Input' },
        indicators: [],
        advice: []
      };
    }

    const lang = getActiveLang();
    let score = 0;
    const detected = [];

    MSG_RULES.forEach(rule => {
      if (rule.pattern.test(text)) {
        score += rule.weight;
        detected.push({
          id: rule.id,
          label: rule.label[lang] || rule.label.en,
          desc: rule.desc[lang] || rule.desc.en,
          weight: rule.weight
        });
      }
    });

    // Baseline heuristic for very short generic text
    if (detected.length === 0 && text.trim().length > 10) {
      score = 8; // Baseline caution
    }

    // Clamp score 0 - 100
    score = Math.min(100, Math.max(0, score));

    let riskLevel = 'safe';
    let riskColor = 'secondary';
    if (score >= 60) {
      riskLevel = 'high';
      riskColor = 'danger';
    } else if (score >= 25) {
      riskLevel = 'medium';
      riskColor = 'tertiary';
    }

    const riskLabels = {
      high: { gu: 'ગંભીર જોખમ (High Risk Scam)', hi: 'गंभीर जोखिम (High Risk Scam)', en: 'Critical Threat (High Risk Scam)' },
      medium: { gu: 'શંકાસ્પદ સંદેશ (Suspicious)', hi: 'संदिग्ध संदेश (Suspicious)', en: 'Suspicious Activity Detected' },
      safe: { gu: 'ઓછું જોખમ (Low Risk)', hi: 'कम जोखिम (Low Risk)', en: 'Low Risk Indicators' }
    };

    const adviceList = {
      high: {
        gu: [
          'કોઈપણ લિંક પર ક્લિક ના કરો અને કોઈપણ ફાઈલ કે APK ડાઉનલોડ ના કરો.',
          'મોકલનાર નંબરને WhatsApp/SMS માં તરત જ બ્લોક કરો.',
          'જો બેંક વિગતો દાખલ કરી દીધી હોય તો તાત્કાલિક નેટબેંકિંગ પાસવર્ડ બદલો અને 1930 પર કોલ કરો.'
        ],
        hi: [
          'किसी भी लिंक पर क्लिक न करें और कोई APK या फाइल डाउनलोड न करें।',
          'भेजने वाले नंबर को तुरंत WhatsApp/SMS में ब्लॉक और रिपोर्ट करें।',
          'यदि बैंक विवरण डाल चुके हैं तो तुरंत नेटबैंकिंग पासवर्ड बदलें और 1930 पर कॉल करें।'
        ],
        en: [
          'Never click any links or download any files/APKs from this message.',
          'Immediately block and report the sender on WhatsApp or SMS.',
          'If bank credentials or card details were entered, freeze cards immediately and call 1930.'
        ]
      },
      medium: {
        gu: [
          'કોઈપણ OTP, ATM PIN કે વ્યક્તિગત દસ્તાવેજ શેર કરશો નહીં.',
          'સંબંધિત સંસ્થા કે બેંકની સત્તાવાર વેબસાઇટ પરથી જ માહિતી ચકાસો.',
          'અજાણ્યા નંબર પર પૈસા ટ્રાન્સફર કરશો નહીં.'
        ],
        hi: [
          'कोई भी OTP, ATM PIN या व्यक्तिगत दस्तावेज साझा न करें।',
          'संबंधित संस्था या बैंक की आधिकारिक वेबसाइट से ही पुष्टि करें।',
          'किसी अज्ञात नंबर पर कोई राशि ट्रांसफर न करें।'
        ],
        en: [
          'Do not share any OTP, ATM PIN, or personal documents.',
          'Verify claims only through official institutional customer care portals.',
          'Never transfer funds or install screen sharing apps like AnyDesk/TeamViewer.'
        ]
      },
      safe: {
        gu: [
          'કોઈ દેખીતું જોખમ જણાયું નથી, છતાં અજાણ્યા સ્ત્રોત સામે સાવચેત રહો.',
          'કોઈપણ સંજોગોમાં OTP કે PIN કોઈને જણાવશો નહીં.'
        ],
        hi: [
          'कोई स्पष्ट जोखिम नहीं मिला, फिर भी अज्ञात स्रोत से सावधान रहें।',
          'किसी भी परिस्थिति में अपना OTP या PIN किसी को न बताएं।'
        ],
        en: [
          'No immediate threat patterns detected, but always verify sender identity.',
          'Remember: legitimate organizations never request confidential credentials.'
        ]
      }
    };

    return {
      score,
      riskLevel,
      riskColor,
      riskLabel: (riskLabels[riskLevel] && riskLabels[riskLevel][lang]) || riskLabels[riskLevel].en,
      indicators: detected,
      advice: (adviceList[riskLevel] && adviceList[riskLevel][lang]) || adviceList[riskLevel].en
    };
  }

  /* ─────────────────── 2. URL RULES & ANALYZER ─────────────────── */
  const URL_RULES = [
    {
      weight: 30,
      test: (u) => /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i.test(u),
      label: {
        gu: 'IP એડ્રેસ સીધું હોસ્ટ તરીકે વપરાયું (Raw IP Host)',
        hi: 'IP एड्रेस सीधे होस्ट के रूप में प्रयुक्त (Raw IP Host)',
        en: 'Raw IP Address used as Website Host'
      },
      desc: {
        gu: 'કાયદેસર સંસ્થાઓ IP ને બદલે ડોમેન વાપરે છે; IP નો સીધો ઉપયોગ ફિશિંગનું મોટું લક્ષણ છે.',
        hi: 'वैध संस्थाएं IP के बजाय डोमेन उपयोग करती हैं; IP का उपयोग फ़िशिंग का संकेत है।',
        en: 'Legitimate institutions use registered domain names. Raw IP addresses strongly indicate malicious infrastructure.'
      }
    },
    {
      weight: 25,
      test: (u) => /\.xyz|\.top|\.cc|\.tk|\.ml|\.ga|\.cf|\.click|\.work|\.loan|\.gq/i.test(u),
      label: {
        gu: 'શંકાસ્પદ કે અસામાન્ય ડોમેન એક્સટેન્શન (.xyz / .top / .cc)',
        hi: 'संदिग्ध डोमेन एक्सटेंशन (.xyz / .top / .cc)',
        en: 'High-Risk Cheap/Abused TLD Extension (.xyz / .top / .cc)'
      },
      desc: {
        gu: 'સાયબર ગુનેગારો ટૂંકા ગાળાના નિકાલજોગ ડોમેન્સ માટે આવા ફ્રી કે સસ્તા એક્સટેન્શન વાપરે છે.',
        hi: 'साइबर अपराधी त्वरित धोखाधड़ी के लिए ऐसे सस्ते या मुफ्त डोमेन एक्सटेंशन का उपयोग करते हैं।',
        en: 'Threat actors frequently register cheap or disposable top-level domains for short-lived phishing campaigns.'
      }
    },
    {
      weight: 25,
      test: (u) => /(sbi|hdfc|icici|axis|pnb|bob|kotak|paytm|phonepe|gpay|bhim).{0,25}(kyc|update|verify|reward|login|online|pan|bill)/i.test(u) &&
                   !/(onlinesbi\.sbi|hdfcbank\.com|icicibank\.com|axisbank\.com|bankofbaroda\.in|pnbindia\.in|kotak\.com)/i.test(u),
      label: {
        gu: 'બેંક / પેમેન્ટ બ્રાન્ડની ઓળખ ચોરી (Brand Impersonation)',
        hi: 'बैंक / भुगतान ब्रांड पहचान चोरी (Brand Impersonation)',
        en: 'Banking / Payment Brand Impersonation'
      },
      desc: {
        gu: 'સત્તાવાર બેંક ડોમેન વગર SBI કે Paytm જેવી બ્રાન્ડના નામે નકલી પેજ બનાવવામાં આવ્યું છે.',
        hi: 'आधिकारिक बैंक डोमेन के बिना SBI या Paytm जैसे ब्रांड के नाम पर नकली पेज बनाया गया है।',
        en: 'Domain uses trusted banking keywords to mimic genuine portals without owning the authentic domain.'
      }
    },
    {
      weight: 20,
      test: (u) => /(gov\.in|police|echallan|parivahan|pmkisan|ayushman).{0,20}(?!gov\.in)/i.test(u) && !/\.gov\.in/i.test(u),
      label: {
        gu: 'સરકારી પોર્ટલની નકલ (Fake Govt Portal)',
        hi: 'सरकारी पोर्टल की नकल (Fake Govt Portal)',
        en: 'Fake Government Portal Impersonation'
      },
      desc: {
        gu: 'ભારત સરકારની તમામ અધિકૃત સાઇટ્સ માત્ર .gov.in અથવા .nic.in પર જ હોય છે.',
        hi: 'भारत सरकार की सभी आधिकारिक वेबसाइट्स केवल .gov.in या .nic.in पर होती हैं।',
        en: 'Authentic Indian government portals strictly end in .gov.in or .nic.in.'
      }
    },
    {
      weight: 18,
      test: (u) => /bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy/i.test(u),
      label: {
        gu: 'URL શોર્ટનર દ્વારા અસલી સરનામું છુપાવેલું છે (URL Shortener)',
        hi: 'URL शॉर्टनर से असली पता छुपाया गया है (URL Shortener)',
        en: 'URL Shortener Hiding True Destination'
      },
      desc: {
        gu: 'શોર્ટ લિંક વાપરીને અંતિમ નકલી વેબસાઇટનું સરનામું વપરાશકર્તાથી છુપાવવામાં આવે છે.',
        hi: 'शॉर्ट लिंक का उपयोग कर अंतिम नकली वेबसाइट का पता छुपाया जाता है।',
        en: 'URL shortening services are frequently exploited to conceal dangerous landing pages.'
      }
    },
    {
      weight: 15,
      test: (u) => /^http:\/\//i.test(u) || !/^https:\/\//i.test(u),
      label: {
        gu: 'અસુરક્ષિત HTTP કનેક્શન (No HTTPS Encryption)',
        hi: 'असुरक्षित HTTP कनेक्शन (No HTTPS Encryption)',
        en: 'Insecure Plain HTTP (Lack of TLS/HTTPS)'
      },
      desc: {
        gu: 'વેબસાઇટ પર દાખલ કરેલો ડેટા એન્ક્રિપ્ટેડ નથી અને રસ્તામાં ચોરાઈ શકે છે.',
        hi: 'वेबसाइट पर दर्ज डेटा एन्क्रिप्टेड नहीं है और बीच में चोरी हो सकता है।',
        en: 'Traffic is transmitted unencrypted, exposing all submitted credentials to interceptors.'
      }
    },
    {
      weight: 15,
      test: (u) => /\.apk|\/download\/|\/app\//i.test(u),
      label: {
        gu: 'ખતરનાક APK / માલવેર ડાઉનલોડ લિંક',
        hi: 'खतरनाक APK / मैलवेयर डाउनलोड लिंक',
        en: 'Potentially Harmful APK / Application Download'
      },
      desc: {
        gu: 'Google Play Store બહારથી APK ઇન્સ્ટોલ કરાવવાનો પ્રયાસ ફોન હેક કરી શકે છે.',
        hi: 'Google Play Store के बाहर से APK इंस्टॉल कराने का प्रयास फोन हैक कर सकता है।',
        en: 'Sideloading APK packages outside official app stores carries high malware and spyware risk.'
      }
    }
  ];

  function analyseURL(rawUrl) {
    if (!rawUrl || !rawUrl.trim()) {
      return {
        score: 0,
        riskLevel: 'safe',
        riskLabel: { gu: 'ખાલી URL', hi: 'खाली URL', en: 'Empty URL' },
        indicators: []
      };
    }

    const clean = rawUrl.trim();
    const lang = getActiveLang();
    let score = 0;
    const detected = [];

    URL_RULES.forEach(rule => {
      if (rule.test(clean)) {
        score += rule.weight;
        detected.push({
          label: rule.label[lang] || rule.label.en,
          desc: rule.desc[lang] || rule.desc.en,
          weight: rule.weight
        });
      }
    });

    // Check if domain is a known trusted verified site
    const trustedDomains = [
      'onlinesbi.sbi', 'sbi.co.in', 'hdfcbank.com', 'icicibank.com', 'axisbank.com',
      'cybercrime.gov.in', 'gujarat.gov.in', 'digitalgujarat.gov.in', 'pgvcl.com',
      'dgvcl.com', 'mgvcl.com', 'ugvcl.com', 'incometax.gov.in', 'uidai.gov.in'
    ];
    const isTrusted = trustedDomains.some(d => clean.toLowerCase().includes(d));

    if (isTrusted && detected.length === 0) {
      score = 4;
    } else if (detected.length === 0) {
      score = 15; // Baseline caution
    }

    score = Math.min(100, Math.max(0, score));

    let riskLevel = 'safe';
    let riskColor = 'secondary';
    if (score >= 50) {
      riskLevel = 'high';
      riskColor = 'danger';
    } else if (score >= 20) {
      riskLevel = 'medium';
      riskColor = 'tertiary';
    }

    const riskLabels = {
      high: { gu: 'અત્યંત જોખમી (High Risk Phishing)', hi: 'अत्यधिक खतरनाक (High Risk Phishing)', en: 'Critical Threat (Phishing Detected)' },
      medium: { gu: 'શંકાસ્પદ લિંક (Suspicious URL)', hi: 'संदिग्ध लिंक (Suspicious URL)', en: 'Suspicious Domain Activity' },
      safe: { gu: 'ઓછું જોખમ (Low Risk)', hi: 'कम जोखिम (Low Risk)', en: 'Low Risk Profile' }
    };

    return {
      url: clean,
      score,
      riskLevel,
      riskColor,
      riskLabel: (riskLabels[riskLevel] && riskLabels[riskLevel][lang]) || riskLabels[riskLevel].en,
      indicators: detected,
      isTrusted
    };
  }

  /* ─────────────────── 3. QR / IMAGE ANALYZER ─────────────────── */
  function analyseQRorImage(contentOrFilename) {
    const lang = getActiveLang();
    const str = (contentOrFilename || '').toLowerCase();

    // Default mock scenarios based on typical Gujarat scams
    const isElectricity = str.includes('bill') || str.includes('mseb') || str.includes('discom') || str.includes('pgvcl') || str.includes('ugvcl') || str.includes('mgvcl') || str.includes('dgvcl') || str.includes('1480') || true;

    return {
      score: 94,
      riskLevel: 'high',
      riskColor: 'danger',
      riskLabel: {
        gu: 'ઉચ્ચ જોખમ — નકલી વીજળી બિલ QR સ્કેમ',
        hi: 'उच्च जोखिम — फर्जी बिजली बिल QR घोटाला',
        en: 'Critical Threat — Impersonated Utility QR Scam'
      }[lang] || 'Critical Threat',
      decodedPayload: 'upi://pay?pa=fake.msebupdate@oksbi&pn=DiscomPower&am=1480&cu=INR',
      detectedVPA: 'fake.msebupdate@oksbi',
      claimedMerchant: 'Discom Power Utility',
      indicators: [
        {
          label: {
            gu: 'વ્યક્તિગત બેંક એકાઉન્ટ ડિટેક્ટ થયું (@oksbi)',
            hi: 'व्यक्तिगत बैंक खाता पहचाना गया (@oksbi)',
            en: 'Personal Bank Account Detected (@oksbi)'
          }[lang],
          desc: {
            gu: 'સરકારી વીજ કંપનીઓ ક્યારેય અંગત વ્યક્તિગત UPI ID પર ચુકવણી સ્વીકારતી નથી.',
            hi: 'सरकारी बिजली कंपनियां कभी व्यक्तिगत UPI ID पर भुगतान स्वीकार नहीं करतीं।',
            en: 'Utility corporations strictly use registered commercial merchant aggregators.'
          }[lang]
        },
        {
          label: {
            gu: 'ઝડપી વીજળી કાપવાનો ખોટો ડર (Urgency Threat)',
            hi: 'बिजली काटने का झूठा डर (Urgency Threat)',
            en: 'Fabricated Power Disconnection Threat'
          }[lang],
          desc: {
            gu: '"આજે રાત્રે 9:30 વાગ્યે વીજળી કટ થશે" તેવો મેસેજ માનસિક દબાણ લાવવા વપરાય છે.',
            hi: '"आज रात 9:30 बजे बिजली कट जाएगी" का मैसेज जल्दबाजी में भुगतान करवाने के लिए है।',
            en: 'Urgent threats are intentionally crafted to bypass critical citizen verification.'
          }[lang]
        }
      ],
      safeSteps: [
        {
          gu: 'આ QR કોડ પર ક્યારેય ચુકવણી ના કરો.',
          hi: 'इस QR कोड पर कभी भुगतान न करें।',
          en: 'Never scan or approve payments to this QR code.'
        }[lang],
        {
          gu: 'ફક્ત સત્તાવાર PGVCL / UGVCL / DGVCL પોર્ટલ પરથી જ બિલ ભરો.',
          hi: 'केवल आधिकारिक बिजली कंपनी पोर्टल से ही बिल का भुगतान करें।',
          en: 'Verify dues only through the official Discom web portal or consumer app.'
        }[lang],
        {
          gu: 'સાયબર સેલ હેલ્પલાઇન ૧૯૩૦ પર ફરિયાદ નોંધાવો.',
          hi: 'साइबर सेल हेल्पलाइन 1930 पर शिकायत दर्ज करें।',
          en: 'Report the scammer details to the national 1930 cyber fraud helpline.'
        }[lang]
      ]
    };
  }

  /* ─────────────────── 4. COMPLAINT DRAFT GENERATOR ─────────────────── */
  function generateComplaintDraft(data) {
    const lang = getActiveLang();
    const now = new Date();
    const dateStr = now.toLocaleDateString(lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const category = data.category || 'ઓનલાઇન નાણાકીય છેતરપિંડી / Online Financial Fraud';
    const amount = data.amount ? `₹${data.amount}` : 'N/A';
    const txnId = data.txnId || 'N/A';
    const suspectPhone = data.suspectPhone || 'N/A';
    const suspectLink = data.suspectLink || 'N/A';
    const description = data.description || '';

    if (lang === 'gu') {
      return `પ્રતિ,
માનનીય પોલીસ અધિકારીશ્રી / સાયબર ક્રાઇમ સેલ,
ગુજરાત રાજ્ય / રાષ્ટ્રીય સાયબર ક્રાઇમ પોર્ટલ (૧૯૩૦)

વિષય: સાયબર છેતરપિંડી સંબંધિત ઔપચારિક ફરિયાદ નોંધણી બાબત

માનનીય સાહેબશ્રી,
હું આથી વિનંતી કરું છું કે મારી સાથે બનેલ સાયબર છેતરપિંડીના બનાવની તાત્કાલિક નોંધ લઈ યોગ્ય કાયદેસરની કાર્યવાહી કરવા કૃપા કરશો. બનાવની મુખ્ય વિગતો નીચે મુજબ છે:

૧. ઘટનાની તારીખ અને સમય: ${dateStr}
૨. છેતરપિંડીનો પ્રકાર: ${category}
૩. ગુમાવેલ રકમ: ${amount}
૪. ટ્રાન્ઝેક્શન / સંદર્ભ નંબર (UTR/Txn ID): ${txnId}
૫. શંકાસ્પદ નંબર / WhatsApp સંપર્ક: ${suspectPhone}
૬. શંકાસ્પદ લિંક / વેબસાઇટ / QR પેલોડ: ${suspectLink}

ઘટનાની વિગતવાર વિગત:
${description || 'મને ઉપરોક્ત શંકાસ્પદ નંબર પરથી સંદેશો / કોલ આવેલ હતો, જેમાં ડરાવીને અથવા લાલચ આપીને નાણાં ટ્રાન્સફર કરાવવામાં આવ્યા હતા.'}

વિનંતી:
આ નાણાં છેતરપિંડી કરનારના ખાતામાં ફ્રીઝ થાય તે માટે સંબંધિત બેંક નોડલ અધિકારીને તાત્કાલિક સૂચના આપવા અને ગુનેગારો સામે કડક કાનૂની પગલાં ભરવા નમ્ર અરજ છે.

આપનો/આપની વિશ્વાસુ,
સહાયતા મેળવનાર નાગરિક
સંપર્ક: (આપનો ફોન નંબર અહીં લખો)
તારીખ: ${dateStr}`;
    } else if (lang === 'hi') {
      return `सेवा में,
माननीय पुलिस अधिकारी / साइबर क्राइम सेल,
गुजरात राज्य / राष्ट्रीय साइबर क्राइम पोर्टल (1930)

विषय: साइबर धोखाधड़ी के संबंध में औपचारिक शिकायत दर्ज करने हेतु

महोदय,
सविनय निवेदन है कि मेरे साथ हुई साइबर धोखाधड़ी की घटना को संज्ञान में लेकर तत्काल कानूनी कार्रवाई करने की कृपा करें। घटना का विवरण निम्नानुसार है:

1. घटना की तिथि और समय: ${dateStr}
2. धोखाधड़ी की श्रेणी: ${category}
3. गंवाई गई राशि: ${amount}
4. ट्रांजैक्शन संदर्भ संख्या (UTR/Txn ID): ${txnId}
5. संदिग्ध फोन नंबर / WhatsApp संपर्क: ${suspectPhone}
6. संदिग्ध लिंक / वेबसाइट / QR विवरण: ${suspectLink}

घटना का संक्षिप्त विवरण:
${description || 'मुझे उपरोक्त संदिग्ध नंबर से कॉल/मैसेज प्राप्त हुआ था, जिसमें डराकर या लालच देकर अनधिकृत ट्रांजैक्शन करवाया गया।'}

प्रार्थना:
कृपया संदिग्ध खाते में धनराशि फ्रीज कराने हेतु संबंधित बैंक को त्वरित निर्देश जारी करें और अपराधियों के विरुद्ध कड़ी कार्रवाई करें।

भवदीय / भवदीया,
पीड़ित नागरिक
संपर्क: (अपना फोन नंबर यहाँ लिखें)
तिथि: ${dateStr}`;
    } else {
      return `To,
The Investigating Officer / Cyber Crime Cell,
National Cyber Crime Reporting Portal (1930 / cybercrime.gov.in)

Subject: Formal Cyber Crime Complaint Report

Respected Officer,
I am writing to formally report an incident of cyber fraud committed against me. Please register this complaint and initiate immediate investigative action:

1. Date & Time of Incident: ${dateStr}
2. Incident Category: ${category}
3. Disputed Amount: ${amount}
4. Transaction ID / UTR / Reference: ${txnId}
5. Suspect Contact / Phone Number: ${suspectPhone}
6. Suspect Link / Website / QR Payload: ${suspectLink}

Summary of Incident:
${description || 'I received an unsolicited message/call from the suspect who coerced or deceived me into an unauthorized transaction.'}

Requested Action:
I urgently request the Cyber Cell to issue a lien/freeze request to the destination bank/intermediary wallet to secure the defrauded funds and take appropriate legal action under the IT Act.

Yours faithfully,
Complainant Citizen
Contact: (Your Phone Number)
Date: ${dateStr}`;
    }
  }

  // Export globally
  window.SG = window.SG || {};
  window.SG.analyseMessage = analyseMessage;
  window.SG.analyseURL = analyseURL;
  window.SG.analyseQRorImage = analyseQRorImage;
  window.SG.generateComplaintDraft = generateComplaintDraft;
})();

