// Notifications are derived from the signed-in citizen's recorded activity.
;(function () {
  const header = document.querySelector('header.fixed');
  if (!header || /^\/(admin|login)(?:\/|$)/.test(location.pathname)) return;
  const actions = header.lastElementChild;
  const token = sessionStorage.getItem('citizenToken');
  if (!actions || !token || document.getElementById('notifications-button')) return;
  const api = window.SFIC_API_BASE_URL.replace(/\/$/, '');
  const copy = {
    en: {title: 'Notifications', empty: 'No account activity yet.', loading: 'Loading notifications…', error: 'Unable to load notifications. Try again.', read: 'Mark all as read', unread: 'unread', scans: 'scan', risk: 'risk', draft: 'Complaint draft', note: 'Scan results and saved complaint updates. Read status is saved on this browser.', close: 'Close notifications'},
    gu: {title: 'સૂચનાઓ', empty: 'હજુ સુધી ખાતાની કોઈ પ્રવૃત્તિ નથી.', loading: 'સૂચનાઓ લોડ થઈ રહી છે…', error: 'સૂચનાઓ લોડ થઈ શકી નથી. ફરી પ્રયાસ કરો.', read: 'બધી વાંચેલી તરીકે ચિહ્નિત કરો', unread: 'વાંચવાની બાકી', scans: 'સ્કેન', risk: 'જોખમ', draft: 'ફરિયાદ ડ્રાફ્ટ', note: 'સ્કેન પરિણામો અને સાચવેલી ફરિયાદોના અપડેટ. વાંચેલી સૂચનાઓ આ બ્રાઉઝરમાં યાદ રાખવામાં આવે છે.', close: 'સૂચનાઓ બંધ કરો'},
    hi: {title: 'सूचनाएँ', empty: 'अभी खाते में कोई गतिविधि नहीं है।', loading: 'सूचनाएँ लोड हो रही हैं…', error: 'सूचनाएँ लोड नहीं हो सकीं। फिर कोशिश करें।', read: 'सभी को पढ़ा हुआ चिह्नित करें', unread: 'अपठित', scans: 'स्कैन', risk: 'जोखिम', draft: 'शिकायत ड्राफ्ट', note: 'स्कैन परिणाम और सहेजी गई शिकायतों के अपडेट। पढ़ने की स्थिति इस ब्राउज़र में सहेजी जाती है।', close: 'सूचनाएँ बंद करें'},
  };
  const words = () => copy[window.SG?.lang?.()] || copy.en;
  const button = document.createElement('button');
  button.id = 'notifications-button'; button.type = 'button'; button.className = 'account-notifications-toggle';
  button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'account-notifications');
  const icon = document.createElement('span'); icon.className = 'material-symbols-outlined'; icon.textContent = 'notifications'; icon.setAttribute('aria-hidden', 'true');
  const badge = document.createElement('span'); badge.className = 'account-notifications-count'; badge.hidden = true;
  button.append(icon, badge); actions.insertBefore(button, actions.querySelector('.user-nav-actions') || actions.lastElementChild);
  const panel = document.createElement('section'); panel.id = 'account-notifications'; panel.className = 'account-notifications'; panel.hidden = true;
  const top = document.createElement('div'); top.className = 'account-notifications-top';
  const title = document.createElement('h2'); title.id = 'notifications-title'; panel.setAttribute('aria-labelledby', title.id);
  const close = document.createElement('button'); close.type = 'button'; close.textContent = '×';
  const read = document.createElement('button'); read.type = 'button'; read.className = 'account-notifications-read';
  const list = document.createElement('div'); list.className = 'account-notifications-list'; list.setAttribute('aria-live', 'polite');
  const note = document.createElement('p'); note.className = 'account-notifications-note';
  top.append(title, close); panel.append(top, read, list, note); document.body.append(panel);
  let entries = [], seen = new Set(), storageKey, loading = false, failed = false, started = false;
  function unreadCount() { return entries.filter(entry => !seen.has(entry.id)).length; }
  function render() {
    const text = words(), count = unreadCount();
    button.setAttribute('aria-label', `${text.title}${count ? ` (${count} ${text.unread})` : ''}`);
    button.title = text.title; badge.textContent = String(count); badge.hidden = !count;
    title.textContent = text.title; close.setAttribute('aria-label', text.close); read.textContent = text.read; note.textContent = text.note;
    read.disabled = loading || !count; list.replaceChildren();
    if (loading || failed || !started || !entries.length) { list.textContent = failed ? text.error : loading || !started ? text.loading : text.empty; return; }
    for (const entry of entries) {
      const link = document.createElement('a'); link.className = 'account-notifications-item'; link.href = entry.href;
      if (!seen.has(entry.id)) link.classList.add('is-unread');
      const heading = document.createElement('strong'); heading.textContent = entry.type === 'scan'
        ? `${entry.kind} ${text.scans} · ${entry.risk} ${text.risk} (${entry.score}/100)`
        : `${text.draft} #${entry.recordId} · ${entry.status}`;
      const date = document.createElement('time'); date.dateTime = entry.date;
      date.textContent = new Date(entry.date).toLocaleString(window.SG?.lang?.() || 'en');
      link.append(heading, date); link.addEventListener('click', () => markRead([entry.id])); list.append(link);
    }
  }
  function markRead(ids) {
    ids.forEach(id => seen.add(id));
    try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify([...seen].slice(-200))); } catch {}
    render();
  }
  async function load() {
    if (loading || !storageKey) return;
    loading = true; failed = false; render();
    try {
      const get = async path => {
        const response = await fetch(api + path, {headers: {Authorization: `Bearer ${sessionStorage.getItem("citizenToken")}`}, signal: AbortSignal.timeout(15000)});
        if (!response.ok) throw new Error('Notifications unavailable');
        const data = await response.json(); if (!data.success) throw new Error('Notifications unavailable'); return data;
      };
      const [scans, complaints] = await Promise.all([get('/api/scans/history'), get('/api/guidance/complaints/history')]);
      entries = [
        ...scans.scans.slice(0, 20).map(scan => ({id: `scan:${scan.id}`, type: 'scan', kind: scan.scan_type, risk: scan.risk_level, score: scan.risk_score, date: scan.created_at, href: '/app/profile/index.html#citizen-scan-history'})),
        ...complaints.complaints.slice(0, 20).map(draft => ({id: `draft:${draft.id}:${draft.updated_at || draft.created_at}`, type: 'draft', recordId: draft.id, status: draft.status, date: draft.updated_at || draft.created_at, href: '/app/index.html#saved-complaint-drafts'})),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
    } catch { failed = true; }
    finally { loading = false; render(); }
  }
  function closePanel() { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); }
  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden; button.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) load();
  });
  close.addEventListener('click', () => { closePanel(); button.focus(); });
  read.addEventListener('click', () => markRead(entries.map(entry => entry.id)));
  document.addEventListener('click', event => { if (!panel.contains(event.target) && !button.contains(event.target)) closePanel(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { closePanel(); button.focus(); } });
  document.addEventListener('langchange', render);
  function start() {
    const user = window.SG?.currentUser;
    if (window.SG?.accountError) { failed = true; render(); return; }
    if (!user || started) return;
    started = true; storageKey = `sg_notifications_read:${user.id}`;
    try { const stored = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(stored)) seen = new Set(stored.filter(id => typeof id === 'string')); } catch {}
    load();
  }
  document.addEventListener('accountloaded', start); render(); start();
  document.addEventListener('accountunavailable', () => { failed = true; render(); });
})();
