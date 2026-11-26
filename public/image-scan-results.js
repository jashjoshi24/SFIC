;(function (root) {
  'use strict';
  const copy = {
    en: {signal:'Risk signal detected',brand:'Claimed brand',domain:'Detected domain',actions:'What to do next',precautions:'Keep in mind',sources:'References',guidance:'Safety guidance',emptyRisk:'No risk indicators were found.',emptyGuidance:'Verify the sender and recipient through an official channel before making a payment. Do not share your UPI PIN.',copyText:'Copy text',lines:'lines'},
    gu: {signal:'જોખમનો સંકેત મળ્યો',brand:'દાવો કરેલી બ્રાન્ડ',domain:'મળેલું ડોમેન',actions:'હવે શું કરવું',precautions:'ધ્યાનમાં રાખો',sources:'સંદર્ભો',guidance:'સુરક્ષા માર્ગદર્શન',emptyRisk:'કોઈ જોખમનો સંકેત મળ્યો નથી.',emptyGuidance:'ચુકવણી કરતાં પહેલાં સત્તાવાર માધ્યમથી મોકલનાર અને પ્રાપ્તકર્તાની ચકાસણી કરો. તમારો UPI PIN શેર કરશો નહીં.',copyText:'ટેક્સ્ટ કોપી કરો',lines:'લાઇનો'},
    hi: {signal:'जोखिम का संकेत मिला',brand:'दावा किया गया ब्रांड',domain:'मिला हुआ डोमेन',actions:'अब क्या करें',precautions:'ध्यान रखें',sources:'संदर्भ',guidance:'सुरक्षा मार्गदर्शन',emptyRisk:'जोखिम का कोई संकेत नहीं मिला।',emptyGuidance:'भुगतान से पहले आधिकारिक माध्यम से भेजने वाले और प्राप्तकर्ता की जाँच करें। अपना UPI PIN साझा न करें।',copyText:'टेक्स्ट कॉपी करें',lines:'पंक्तियाँ'},
  };
  const labels = () => copy[root.SG?.lang?.() || root.document?.documentElement.lang?.split('-')[0]] || copy.en;
  const array = value => value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function text(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map(text).filter(Boolean).join('\n');
    if (!value || typeof value !== 'object') return '';
    return [value.url,value.text,value.value,value.payload,value.label,value.title,value.description,value.message,value.reason]
      .find(item => typeof item === 'string' || typeof item === 'number')?.toString() || '';
  }
  const paragraph = value => value ? `<p>${escape(value)}</p>` : '';
  function evidenceHTML(value) {
    return array(value).map(evidence => {
      if (!evidence || typeof evidence !== 'object') return paragraph(text(evidence));
      const fields = [[labels().brand,evidence.claimedBrand],[labels().domain,evidence.detectedDomain]].filter(([,value])=>text(value));
      const facts = fields.length ? `<dl class="scan-evidence-facts">${fields.map(([label,value])=>`<div><dt>${escape(label)}</dt><dd translate="no">${escape(text(value))}</dd></div>`).join('')}</dl>` : '';
      const reason = text(evidence.reason || evidence.details || evidence.description || evidence.text);
      return facts || reason ? `<div class="scan-evidence">${facts}${paragraph(reason)}</div>` : '';
    }).join('');
  }
  function indicators(value) {
    const items = array(value);
    if (!items.length) return `<p class="scan-empty">${escape(labels().emptyRisk)}</p>`;
    return items.map(item => {
      const structured = item && typeof item === 'object';
      const title = structured ? text(item.label || item.title || item.name) || labels().signal : text(item);
      const description = structured ? text(item.description || item.message || item.reason) : '';
      return `<article class="scan-indicator"><h4>${escape(title || labels().signal)}</h4>${paragraph(description)}${structured ? evidenceHTML(item.evidence) : ''}</article>`;
    }).join('');
  }
  function list(title, values, ordered = false) {
    const items = array(values).map(text).filter(Boolean);
    if (!items.length) return '';
    const tag = ordered ? 'ol' : 'ul';
    return `<section class="scan-guidance-list"><h5>${escape(title)}</h5><${tag}>${items.map(item=>`<li>${escape(item)}</li>`).join('')}</${tag}></section>`;
  }
  function sources(value) {
    const links = array(value).map(source => {
      const url = typeof source === 'string' ? source : text(source?.url);
      const name = typeof source === 'object' && source ? text(source.name || source.title) || url : url;
      if (!name) return '';
      try {
        const destination = new URL(url);
        if (!['https:','http:'].includes(destination.protocol)) return `<li>${escape(name)}</li>`;
        return `<li><a href="${escape(destination.href)}" target="_blank" rel="noopener noreferrer">${escape(name)}</a></li>`;
      } catch { return `<li>${escape(name)}</li>`; }
    }).filter(Boolean);
    return links.length ? `<section class="scan-guidance-sources"><h5>${escape(labels().sources)}</h5><ul>${links.join('')}</ul></section>` : '';
  }
  function guidance(value) {
    const items = array(value);
    if (!items.length) return paragraph(labels().emptyGuidance);
    return items.map(item => {
      if (!item || typeof item !== 'object') return `<article class="scan-guidance">${paragraph(text(item))}</article>`;
      return `<article class="scan-guidance"><h4>${escape(text(item.title) || labels().guidance)}</h4>${paragraph(text(item.explanation || item.description || item.text))}${list(labels().actions,item.actions,true)}${list(labels().precautions,item.precautions)}${sources(item.sources)}</article>`;
    }).join('');
  }
  function urlAnalysis(value) {
    if (!value || typeof value !== 'object') return paragraph(text(value));
    const risk = text(value.riskLevel || value.risk_level);
    const score = value.score ?? value.risk_score;
    const summary = [risk,Number.isFinite(Number(score)) && score != null && score !== '' ? `${score}/100` : ''].filter(Boolean).join(' · ');
    return paragraph(summary) + paragraph(text(value.recommendation || value.description || value.message)) + (array(value.indicators).length ? indicators(value.indicators) : '');
  }
  root.SGImageResults = {text,indicators,guidance,urlAnalysis,labels};
})(typeof window === 'undefined' ? globalThis : window);
