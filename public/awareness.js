;(async function () {
  const library = document.getElementById('awareness-library');
  const reader = document.getElementById('awareness-reader');
  if (!library && !reader) return;
  const root = library || reader;
  root.textContent = 'Loading safety guides… / માર્ગદર્શિકા લોડ થઈ રહી છે…';
  let guides;
  try {
    const base = (window.SFIC_API_BASE_URL || '').replace(/\/$/, '');
    const response = await fetch(`${base}/api/awareness`, {cache: 'no-store', signal: AbortSignal.timeout(15000)});
    const data = await response.json();
    if (!response.ok || !data.success || !Array.isArray(data.guides)) throw new Error('Library unavailable');
    guides = data.guides;
    root.replaceChildren();
  } catch {
    root.textContent = 'Safety guides could not be loaded. Please try again. / માર્ગદર્શિકા લોડ થઈ શકી નથી.';
    const retry = document.createElement('button');
    retry.type = 'button'; retry.className = 'guide-primary'; retry.textContent = 'Try again / ફરી પ્રયાસ કરો';
    retry.addEventListener('click', () => location.reload()); root.append(retry);
    return;
  }
  const strings = {
    en: {eyebrow:'CYBER SAFETY LIBRARY',title:'Recognize the scam. Know your next step.',intro:'Practical guides to common online fraud. Search a topic, save a guide, or listen on your device.',search:'Search safety guides',placeholder:'Search scams, messages, apps, or warning signs…',all:'All guides',saved:'Saved',clear:'Clear',count:'guides',open:'Read guide',save:'Save guide on this browser',unsave:'Remove saved guide',savedOk:'Guide saved on this browser.',removed:'Guide removed from saved guides.',storage:'Browser storage is unavailable. This guide could not be saved.',minutes:'min read',listen:'Listen',stop:'Stop audio',empty:'No matching guides.',reset:'Reset filters',back:'Back to the library',warnings:'Warning signs',actions:'What to do',report:'If you have already shared details or lost money',reportText:'Stop contact with the suspected scammer. Save messages and transaction references. Contact your bank through an official channel and report financial cyber fraud promptly through cybercrime.gov.in or 1930. Recovery is not guaranteed.',source:'Official reference',independent:'Independent educational guidance. This is not a police or government service.',copy:'Copy link',copied:'Guide link copied.',copyFailed:'Copy failed. Copy this page’s address from your browser.',download:'Download guide (.txt)',print:'Print / save as PDF',notfound:'This guide could not be found.',playing:'Reading this guide. Use Stop audio to end playback.',audioError:'Your device could not read this guide aloud. You can still read the text.',noAudio:'Read-aloud is unavailable in this browser.',voiceFallback:'No matching language voice is installed. Your device may use its default voice.',notice:'Saved guides stay on this browser.',types:{digital:'Digital arrest',jobs:'Job & task scams',electricity:'Electricity / APK scams',loans:'Loan app scams',cards:'Card reward scams',upi:'UPI & QR safety'}},
    gu: {eyebrow:'સાયબર સુરક્ષા લાઇબ્રેરી',title:'છેતરપિંડી ઓળખો. સુરક્ષિત પગલાં જાણો.',intro:'ઓનલાઇન છેતરપિંડી અંગે સરળ માર્ગદર્શિકા. વિષય શોધો, ગાઇડ સાચવો અથવા તમારા ઉપકરણ પર સાંભળો.',search:'સુરક્ષા માર્ગદર્શિકા શોધો',placeholder:'છેતરપિંડી, મેસેજ, એપ કે ચેતવણીના સંકેત શોધો…',all:'બધી માર્ગદર્શિકા',saved:'સાચવેલી',clear:'સાફ કરો',count:'માર્ગદર્શિકા',open:'માર્ગદર્શિકા વાંચો',save:'આ બ્રાઉઝરમાં સાચવો',unsave:'સાચવેલી ગાઇડ દૂર કરો',savedOk:'માર્ગદર્શિકા આ બ્રાઉઝરમાં સાચવી.',removed:'સાચવેલી માર્ગદર્શિકા દૂર કરી.',storage:'બ્રાઉઝર સ્ટોરેજ ઉપલબ્ધ નથી. માર્ગદર્શિકા સાચવી શકાઈ નથી.',minutes:'મિનિટ વાંચન',listen:'સાંભળો',stop:'ઓડિયો બંધ કરો',empty:'કોઈ મેળ ખાતી માર્ગદર્શિકા નથી.',reset:'ફિલ્ટર રીસેટ કરો',back:'લાઇબ્રેરીમાં પાછા જાઓ',warnings:'ચેતવણીના સંકેત',actions:'શું કરવું',report:'માહિતી આપી દીધી હોય કે પૈસા ગુમાવ્યા હોય તો',reportText:'શંકાસ્પદ વ્યક્તિ સાથેનો સંપર્ક બંધ કરો. મેસેજ અને ટ્રાન્ઝેક્શન રેફરન્સ સાચવો. સત્તાવાર સંપર્કથી બેંકને જાણ કરો અને cybercrime.gov.in અથવા 1930 પર નાણાકીય સાયબર છેતરપિંડીની વહેલી તકે જાણ કરો. નાણાં પરત મળવાની ખાતરી નથી.',source:'સત્તાવાર સંદર્ભ',independent:'સ્વતંત્ર શૈક્ષણિક માર્ગદર્શન. આ પોલીસ કે સરકારી સેવા નથી.',copy:'લિંક કૉપિ કરો',copied:'માર્ગદર્શિકાની લિંક કૉપિ કરી.',copyFailed:'કૉપિ થઈ શકી નથી. બ્રાઉઝરમાંથી આ પેજનું સરનામું કૉપિ કરો.',download:'ગાઇડ ડાઉનલોડ (.txt)',print:'પ્રિન્ટ / PDF તરીકે સાચવો',notfound:'આ માર્ગદર્શિકા મળી નથી.',playing:'માર્ગદર્શિકા વાંચી રહી છે. રોકવા ઓડિયો બંધ કરો પસંદ કરો.',audioError:'તમારું ઉપકરણ ગાઇડ વાંચી શક્યું નથી. તમે લખાણ વાંચી શકો છો.',noAudio:'આ બ્રાઉઝરમાં અવાજથી વાંચવાની સુવિધા ઉપલબ્ધ નથી.',voiceFallback:'આ ભાષાનો અવાજ ઇન્સ્ટોલ નથી. ઉપકરણ તેનો મૂળ અવાજ વાપરી શકે છે.',notice:'સાચવેલી માર્ગદર્શિકા આ બ્રાઉઝરમાં રહે છે.'},
    hi: {eyebrow:'साइबर सुरक्षा लाइब्रेरी',title:'ठगी पहचानें। सुरक्षित कदम जानें।',intro:'ऑनलाइन ठगी पर सरल मार्गदर्शिकाएँ। विषय खोजें, गाइड सहेजें या अपने उपकरण पर सुनें।',search:'सुरक्षा मार्गदर्शिकाएँ खोजें',placeholder:'ठगी, संदेश, ऐप या चेतावनी के संकेत खोजें…',all:'सभी गाइड',saved:'सहेजी गई',clear:'साफ करें',count:'मार्गदर्शिकाएँ',open:'गाइड पढ़ें',save:'इस ब्राउज़र में सहेजें',unsave:'सहेजी गाइड हटाएँ',savedOk:'गाइड इस ब्राउज़र में सहेजी गई।',removed:'सहेजी गई गाइड हटाई गई।',storage:'ब्राउज़र स्टोरेज उपलब्ध नहीं। गाइड सहेजी नहीं जा सकी।',minutes:'मिनट पढ़ें',listen:'सुनें',stop:'ऑडियो रोकें',empty:'कोई मेल खाती गाइड नहीं।',reset:'फ़िल्टर रीसेट करें',back:'लाइब्रेरी पर वापस जाएँ',warnings:'चेतावनी के संकेत',actions:'क्या करें',report:'जानकारी साझा कर दी हो या पैसे चले गए हों तो',reportText:'संदिग्ध व्यक्ति से संपर्क रोकें। संदेश और लेनदेन संदर्भ सहेजें। आधिकारिक संपर्क से बैंक को बताएँ और cybercrime.gov.in या 1930 पर वित्तीय साइबर ठगी की जल्द रिपोर्ट करें। पैसे वापस मिलने की गारंटी नहीं है।',source:'आधिकारिक संदर्भ',independent:'स्वतंत्र शैक्षिक मार्गदर्शन। यह पुलिस या सरकारी सेवा नहीं है।',copy:'लिंक कॉपी करें',copied:'गाइड का लिंक कॉपी किया गया।',copyFailed:'कॉपी नहीं हुआ। ब्राउज़र से इस पेज का पता कॉपी करें।',download:'गाइड डाउनलोड (.txt)',print:'प्रिंट / PDF सहेजें',notfound:'यह गाइड नहीं मिली।',playing:'गाइड पढ़ी जा रही है। रोकने के लिए ऑडियो रोकें चुनें।',audioError:'आपका उपकरण गाइड नहीं पढ़ सका। आप पाठ पढ़ सकते हैं।',noAudio:'इस ब्राउज़र में आवाज़ से पढ़ना उपलब्ध नहीं है।',voiceFallback:'इस भाषा की आवाज़ इंस्टॉल नहीं है। उपकरण अपनी डिफ़ॉल्ट आवाज़ इस्तेमाल कर सकता है।',notice:'सहेजी गई गाइड इस ब्राउज़र में रहती हैं.'},
  };
  let language = window.SG?.lang?.() || document.documentElement.lang || 'gu';
  if (!strings[language]) language = 'gu';
  const t = () => strings[language];
  const content = guide => guide.content[language] || guide.content.en;
  const key = 'sg_saved_guides_v1';
  let saved = new Set();
  function loadSaved() { try { const stored = JSON.parse(localStorage.getItem(key) || '[]'); saved = new Set(Array.isArray(stored) ? stored.filter(id => guides.some(g => g.id === id)) : []); } catch { saved = new Set(); } }
  loadSaved();
  let currentAudio = null;
  function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function icon(name) { const node = el('span','material-symbols-outlined',name); node.setAttribute('aria-hidden','true'); return node; }
  function button(text, className, click) { const node = el('button',className,text); node.type = 'button'; node.addEventListener('click',click); return node; }
  const status = el('p','guides-status'); status.setAttribute('role','status');
  function announce(text) { status.textContent = text; }
  function href(guide) { return `/awareness/article/index.html?guide=${encodeURIComponent(guide.id)}`; }
  function bookmark(guide) {
    const node = button('', 'guide-bookmark', () => {
      const next = new Set(saved); next.has(guide.id) ? next.delete(guide.id) : next.add(guide.id);
      try { localStorage.setItem(key,JSON.stringify([...next])); saved = next; render(); announce(saved.has(guide.id) ? t().savedOk : t().removed); } catch { announce(t().storage); }
    });
    node.setAttribute('aria-label',saved.has(guide.id) ? t().unsave : t().save); node.setAttribute('aria-pressed',String(saved.has(guide.id))); node.title = node.getAttribute('aria-label');
    node.append(icon(saved.has(guide.id) ? 'bookmark' : 'bookmark_border')); return node;
  }
  function plainText(guide) {
    const c = content(guide);
    return `${c.title}\n\n${c.summary}\n\n${t().warnings}\n${c.warnings.map(x=>`• ${x}`).join('\n')}\n\n${t().actions}\n${c.actions.map(x=>`• ${x}`).join('\n')}\n\n${t().report}\n${t().reportText}\n\n${t().source}: ${guide.source}\n\n${t().independent}`;
  }
  function readingTime(guide) { return Math.max(1,Math.ceil(plainText(guide).split(/\s+/).length / 150)); }
  function stopAudio() { currentAudio = null; window.speechSynthesis?.cancel(); document.querySelectorAll('[data-listen-guide]').forEach(node => { node.textContent = t().listen; node.setAttribute('aria-pressed','false'); }); }
  function audioButton(guide) {
    const node = button(currentAudio === guide.id ? t().stop : t().listen,'guide-secondary', () => {
      if (currentAudio === guide.id) { stopAudio(); return; }
      stopAudio();
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { announce(t().noAudio); return; }
      const speech = new SpeechSynthesisUtterance(plainText(guide)); speech.lang = `${language}-IN`;
      const voice = speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().startsWith(language)); if (voice) speech.voice = voice;
      speech.onend = () => { if (currentAudio === guide.id) stopAudio(); };
      speech.onerror = () => { if (currentAudio === guide.id) { stopAudio(); announce(t().audioError); } };
      currentAudio = guide.id; node.textContent = t().stop; node.setAttribute('aria-pressed','true');
      announce(voice ? t().playing : t().voiceFallback); speechSynthesis.speak(speech);
    });
    node.dataset.listenGuide = guide.id; node.setAttribute('aria-pressed',String(currentAudio === guide.id)); return node;
  }
  const params = new URLSearchParams(location.search);
  let query = params.get('q') || '', category = params.get('category') || 'all';
  if (!['all','saved',...guides.map(g=>g.id)].includes(category)) category = 'all';
  let search, filters, cards, count, heading, introduction, clear;
  function matches(guide) {
    const haystack = [guide.id,...Object.values(guide.category),...Object.values(guide.content).flatMap(c=>[c.title,c.summary,...c.warnings,...c.actions])].join(' ').normalize('NFKC').toLocaleLowerCase();
    return (category === 'all' || category === guide.id || (category === 'saved' && saved.has(guide.id))) && query.trim().normalize('NFKC').toLocaleLowerCase().split(/\s+/).every(term=>haystack.includes(term));
  }
  function renderLibrary() {
    library.lang = language; heading.textContent = t().title; introduction.textContent = t().intro;
    library.querySelector('.guides-eyebrow').textContent = t().eyebrow;
    search.setAttribute('aria-label',t().search); search.placeholder = t().placeholder; clear.textContent = t().clear;
    clear.disabled = !query; filters.replaceChildren();
    for (const id of ['all',...guides.map(g=>g.id),'saved']) {
      const label = id === 'all' ? t().all : id === 'saved' ? t().saved : (guides.find(g=>g.id===id).category[language] || guides.find(g=>g.id===id).category.en);
      const filter = button(label,`guide-filter${category===id?' is-active':''}`,()=>{category=id;updateURL();renderLibrary();}); filter.setAttribute('aria-pressed',String(category===id)); filters.append(filter);
    }
    cards.replaceChildren(); const visible = guides.filter(matches); count.textContent = `${visible.length} / ${guides.length} ${t().count}`;
    for (const guide of visible) {
      const c = content(guide), card = el('article','guide-card'); card.dataset.guideId = guide.id;
      const visual = el('div','guide-card-visual');
      if (guide.image) { const image = el('img'); image.src=guide.image || '/brand-mark.svg'; image.alt=''; image.loading='lazy'; image.addEventListener('error',()=>image.remove()); visual.append(image); }
      const symbol = el('span','guide-visual-symbol'); symbol.append(icon(guide.icon)); visual.append(symbol);
      const top = el('div','guide-card-meta'); top.append(el('span','guide-category',(guide.category[language] || guide.category.en)),el('span','guide-readtime',`${readingTime(guide)} ${t().minutes}`));
      const title=el('h2'); const link=el('a','',c.title); link.href=href(guide); title.append(link);
      const footer=el('div','guide-card-actions'); const read=el('a','guide-primary',t().open); read.href=href(guide);
      footer.append(read,audioButton(guide),bookmark(guide)); card.append(visual,top,title,el('p','guide-summary',c.summary),footer); cards.append(card);
    }
    if (!visible.length) { const empty=el('div','guides-empty'); empty.append(el('p','',t().empty),button(t().reset,'guide-primary',()=>{query='';category='all';search.value='';updateURL();renderLibrary();}));cards.append(empty); }
  }
  function updateURL() { const p=new URLSearchParams();if(query)p.set('q',query);if(category!=='all')p.set('category',category);history.replaceState(null,'',location.pathname+(p.size?`?${p}`:'')); }
  function initLibrary() {
    library.replaceChildren();const hero=el('header','guides-heading');heading=el('h1');introduction=el('p');hero.append(el('p','guides-eyebrow'),heading,introduction);
    const form=el('form','guides-search');search=el('input');search.type='search';search.value=query;
    clear=button('', 'guide-secondary',()=>{query='';search.value='';updateURL();renderLibrary();search.focus();});form.append(icon('search'),search,clear);form.addEventListener('submit',e=>e.preventDefault());
    search.addEventListener('input',()=>{query=search.value;updateURL();renderLibrary();});
    filters=el('nav','guide-filters');filters.setAttribute('aria-label','Guide categories'); count=el('p','guides-count');count.setAttribute('aria-live','polite'); cards=el('div','guides-grid');
    library.append(hero,form,filters,count,status,cards); renderLibrary();
  }
  function renderReader() {
    reader.replaceChildren();reader.lang=language;
    const guide = guides.find(g=>g.id===(params.get('guide')||'digital-arrest'));
    const back=el('a','guide-back',t().back);back.href='/awareness/index.html';reader.append(back);
    if (!guide) {reader.append(el('h1','',t().notfound));return;}
    const c=content(guide);document.title=`${c.title} | Surakshit Gujarat`;
    const article=el('article','guide-reader');const label=el('p','guides-eyebrow',(guide.category[language] || guide.category.en));
    article.append(label,el('h1','',c.title),el('p','guide-reader-summary',c.summary),el('p','guide-readtime',`${readingTime(guide)} ${t().minutes}`));
    const actions=el('div','guide-reader-actions');
    actions.append(bookmark(guide),button(t().copy,'guide-secondary',async()=>{try{await navigator.clipboard.writeText(location.href);announce(t().copied);}catch{announce(t().copyFailed);}}),button(t().download,'guide-secondary',()=>{
      const url=URL.createObjectURL(new Blob(['\uFEFF',plainText(guide)],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download=`surakshit-gujarat-${guide.id}-${language}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }),button(t().print,'guide-secondary',()=>window.print()));
    article.append(actions,status);
    for (const [title,items] of [[t().warnings,c.warnings],[t().actions,c.actions]]) {const section=el('section','guide-reader-section');const list=el('ul');items.forEach(text=>list.append(el('li','',text)));section.append(el('h2','',title),list);article.append(section);}
    const help=el('section','guide-report');help.append(el('h2','',t().report),el('p','',t().reportText));const portal=el('a','guide-primary','cybercrime.gov.in');portal.href='https://cybercrime.gov.in/';portal.target='_blank';portal.rel='noopener noreferrer';help.append(portal);article.append(help);
    const source=el('a','guide-source',`${t().source} ↗`);source.href=guide.source;source.target='_blank';source.rel='noopener noreferrer';article.append(source,el('p','guide-disclaimer',t().independent),el('p','guide-disclaimer',t().notice));reader.append(article);
  }
  function render() { if(library)renderLibrary();else renderReader(); }
  if(library)initLibrary();else renderReader();
  document.addEventListener('langchange',event=>{if(!strings[event.detail?.lang])return;stopAudio();language=event.detail.lang;render();});
  window.addEventListener('storage',event=>{if(event.key===key){loadSaved();render();}});
  window.addEventListener('pagehide',stopAudio);
})();
