// Account identity, saved activity, and browser preferences use real state.
;(async function () {
  'use strict';
  const route = location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  if (route.startsWith('/admin')) return;
  const api = (window.SFIC_API_BASE_URL || '').replace(/\/$/, '');
  const token = sessionStorage.getItem('citizenToken');
  const protectedPage = route === '/app' || route.startsWith('/app/') || route === '/complaint';
  const $ = id => document.getElementById(id);
  function signIn() {
    sessionStorage.removeItem('citizenToken');
    sessionStorage.removeItem('citizenUser');
    if (protectedPage) {
      const checker = /^\/app\/check\/(message|url|image)$/.exec(route);
      location.replace('/login/index.html?mode=login' + (checker ? `&tool=${checker[1]}` : ''));
    }
  }
  const sizes = {standard: '100%', large: '112.5%', xlarge: '125%'};
  try {
    document.documentElement.style.fontSize = sizes[localStorage.getItem('sg_font_size')] || sizes.standard;
  } catch {}
  async function request(path, options = {}) {
    const response = await fetch(`${api}${path}`, {
      ...options,
      headers: {...options.headers, Authorization: `Bearer ${token}`},
    });
    if (response.status === 401 || response.status === 403) { signIn(); throw new Error('Please sign in again.'); }
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load saved data.');
    return data;
  }
  function identity(label, accountName = '') {
    document.querySelectorAll('[data-current-user]').forEach(el => { el.textContent = label; });
    const name = typeof accountName === 'string' ? accountName.trim() : '';
    const first = (typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter().segment(name)[Symbol.iterator]().next().value?.segment
      : Array.from(name)[0]) || '—';
    const uppercase = first.toUpperCase();
    const initial = Array.from(uppercase).length > Array.from(first).length ? first : uppercase;
    document.querySelectorAll('[data-current-user-initial]').forEach(el => { el.textContent = initial; });
  }
  document.addEventListener('account-name-changed', event => identity(event.detail, event.detail));
  function table(container, headings, rows) {
    container.replaceChildren();
    if (!rows.length) { container.textContent = 'No scans yet. Your completed scans will appear here.'; return; }
    const table = document.createElement('table'); table.className = 'w-full text-left';
    const head = table.createTHead().insertRow();
    headings.forEach(label => { const th = document.createElement('th'); th.className = 'p-3'; th.textContent = label; head.append(th); });
    const body = table.createTBody();
    rows.forEach(values => { const row = body.insertRow(); values.forEach(value => { const cell = row.insertCell(); cell.className = 'p-3 border-b border-border-hairline'; cell.textContent = String(value ?? '—'); }); });
    container.append(table);
  }
  identity(token ? 'Loading account…' : 'Sign in');
  if (!token) { if (protectedPage) signIn(); return; }
  let user;
  try {
    const data = await request('/api/auth/me'); user = data.user;
    sessionStorage.setItem('citizenUser', JSON.stringify(user));
    identity(user.name, user.name);
    window.SG = window.SG || {};
    window.SG.currentUser = user;
    document.dispatchEvent(new Event('accountloaded'));
  } catch (error) {
    identity('Account unavailable');
    window.SG = window.SG || {};
    window.SG.accountError = true;
    document.dispatchEvent(new Event('accountunavailable'));
    if ($('account-details')) $('account-details').textContent = error.message;
    return;
  }
  const save = $('save-complaint-draft');
  if (route === '/app') {
    const section = document.createElement('section');
    section.id = 'saved-complaint-drafts';
    section.className = 'rounded-2xl bg-surface p-6 my-6 space-y-4';
    const heading = document.createElement('h2'); heading.className = 'text-headline-sm'; heading.textContent = 'Saved complaint drafts';
    const drafts = document.createElement('div'); drafts.textContent = 'Loading saved drafts…'; drafts.setAttribute('aria-live', 'polite');
    section.append(heading, drafts); document.querySelector('main').append(section);
    try {
      const data = await request('/api/guidance/complaints/history'); drafts.replaceChildren();
      if (!data.complaints.length) drafts.textContent = 'No saved drafts yet.';
      for (const draft of data.complaints) {
        const entry = document.createElement('details'); entry.className = 'py-3 border-b border-border-hairline';
        const summary = document.createElement('summary'); summary.textContent = `#${draft.id} · ${draft.status} · ${new Date(draft.created_at).toLocaleString()}`;
        const text = document.createElement('p'); text.className = 'mt-3 whitespace-pre-wrap'; text.textContent = draft.complaint_text;
        entry.append(summary, text); drafts.append(entry);
      }
      if (location.hash === '#saved-complaint-drafts') section.scrollIntoView({block: 'start'});
    } catch (error) { drafts.textContent = error.message; }
  }
  if (save) save.addEventListener('click', async () => {
    const status = $('complaint-save-status');
    const description = $('incident-description').value.trim();
    if (!description) { status.textContent = 'Describe what happened before saving your draft.'; $('incident-description').focus(); return; }
    save.disabled = true; status.textContent = 'Saving draft…';
    try {
      const data = await request('/api/guidance/complaint', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
        incidentDescription: description,
        complaintText: $('complaint-text').value,
        amount: $('form-amount').value || null,
        transactionId: $('form-utr').value,
        incidentDate: $('form-datetime').value ? new Date($('form-datetime').value).toISOString() : null,
        platform: $('form-sender-bank').value,
        suspectDetails: $('form-fraud-account').value,
      })});
      status.textContent = `Draft #${data.complaintId} saved to your account. This does not submit a police complaint.`;
    } catch (error) { status.textContent = error.message; }
    finally { save.disabled = false; }
  });
})();
