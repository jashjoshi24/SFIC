;(function () {
  const $ = id => document.getElementById(id);
  if (!$('profile-details-form')) return;
  const emailLink = document.createElement('a'); emailLink.href='/support/index.html#email-preferences'; emailLink.textContent='Draft reminders, scam alerts, newsletter & support →'; $('email-preferences-form').append(emailLink);
  const api = window.SFIC_API_BASE_URL.replace(/\/$/, '');
  const sizes = {standard: '100%', large: '112.5%', xlarge: '125%'};
  let account, scans = [], drafts = [], initialized = false;
  function message(id, text, error = false) { $(id).textContent = text; $(id).classList.toggle('is-error', error); }
  function signOut() {
    sessionStorage.removeItem('citizenToken'); sessionStorage.removeItem('citizenUser');
    location.assign('/login/index.html?mode=login');
  }
  async function request(path, options = {}) {
    const response = await fetch(api + path, {...options, signal: AbortSignal.timeout(20000), headers: {'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${sessionStorage.getItem('citizenToken')}`}});
    const data = await response.json();
    if (response.status === 401 || response.status === 403) { signOut(); throw new Error('Please sign in again.'); }
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed. Please try again.');
    return data;
  }
  function populate(user) {
    account = user;
    $('profile-name').value = user.name; $('profile-email').value = user.email;
    $('profile-phone').value = user.phone || ''; $('profile-district').value = user.district || '';
    $('profile-email-notifications').checked = user.email_notifications !== false;
    $('profile-display-name').textContent = user.name; $('profile-display-email').textContent = user.email;
    $('profile-member-since').textContent = `Member since ${new Date(user.created_at).toLocaleDateString()}`;
    $('profile-initials').textContent = user.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase();
    sessionStorage.setItem('citizenUser', JSON.stringify(user));
    window.SG.currentUser = user;
    document.dispatchEvent(new CustomEvent('account-name-changed', {detail: user.name}));
  }
  function renderScans() {
    const box = $('citizen-scan-history'); box.replaceChildren(); $('profile-scan-count').textContent = String(scans.length);
    if (!scans.length) { box.textContent = 'No scans yet. Your completed scans will appear here.'; return; }
    const table = document.createElement('table'), header = table.createTHead().insertRow();
    for (const label of ['ID', 'Type', 'Risk', 'Score', 'Date']) { const cell = document.createElement('th'); cell.textContent = label; header.append(cell); }
    const body = table.createTBody();
    for (const scan of scans) { const row = body.insertRow(); for (const value of [scan.id, scan.scan_type, scan.risk_level, `${scan.risk_score}/100`, new Date(scan.created_at).toLocaleString()]) row.insertCell().textContent = value; }
    box.append(table);
  }
  function renderDrafts() {
    const box = $('citizen-complaint-history'); box.replaceChildren(); $('profile-draft-count').textContent = String(drafts.length);
    if (!drafts.length) { box.textContent = 'No complaint drafts saved yet.'; return; }
    for (const draft of drafts) {
      const entry = document.createElement('details'); entry.className = 'profile-draft';
      const title = document.createElement('summary'); title.textContent = `#${draft.id} · ${draft.status} · ${new Date(draft.created_at).toLocaleString()}`;
      const text = document.createElement('p'); text.className = 'profile-draft-text'; text.textContent = draft.complaint_text;
      entry.append(title, text); box.append(entry);
    }
  }
  async function submit(form, statusId, action) {
    const fields = form.querySelector('fieldset');
    if (fields?.disabled) return;
    if (fields) fields.disabled = true;
    message(statusId, 'Saving…');
    try { await action(); } catch (error) { message(statusId, error.message, true); }
    finally { if (fields) fields.disabled = false; }
  }
  $('profile-details-form').addEventListener('submit', event => {
    event.preventDefault(); submit(event.currentTarget, 'profile-details-status', async () => {
      const data = await request('/api/auth/me', {method: 'PATCH', body: JSON.stringify({name: $('profile-name').value.trim(), phone: $('profile-phone').value.trim(), district: $('profile-district').value.trim()})});
      populate(data.user); message('profile-details-status', 'Your details have been saved.');
    });
  });
  $('email-preferences-form').addEventListener('submit', event => {
    event.preventDefault(); submit(event.currentTarget, 'email-preferences-status', async () => {
      const data = await request('/api/auth/me', {method: 'PATCH', body: JSON.stringify({emailNotifications: $('profile-email-notifications').checked})});
      account.email_notifications = data.user.email_notifications;
      window.SG.currentUser.email_notifications = data.user.email_notifications;
      message('email-preferences-status', 'Email preference saved to your account.');
    });
  });
  $('password-form').addEventListener('submit', event => {
    event.preventDefault();
    if ($('new-password').value !== $('confirm-password').value) { message('password-status', 'New passwords do not match.', true); return; }
    submit(event.currentTarget, 'password-status', async () => {
      const data = await request('/api/auth/me/password', {method: 'PATCH', body: JSON.stringify({currentPassword: $('current-password').value, newPassword: $('new-password').value})});
      sessionStorage.setItem('citizenToken', data.token); $('password-form').reset();
      for (const id of ['current-password', 'new-password', 'confirm-password']) $(id).type = 'password';
      message('password-status', data.message);
    });
  });
  $('show-passwords').addEventListener('change', event => { for (const id of ['current-password', 'new-password', 'confirm-password']) $(id).type = event.target.checked ? 'text' : 'password'; });
  $('reading-preferences-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const language = $('profile-language').value, size = $('profile-font-size').value;
      localStorage.setItem('sg_lang', language); localStorage.setItem('sg_font_size', size);
      document.documentElement.style.fontSize = sizes[size]; window.SG?.setLang?.(language);
      message('preferences-status', 'Saved on this browser.');
    } catch { message('preferences-status', 'Browser storage is unavailable. Preferences could not be saved.', true); }
  });
  $('profile-signout').addEventListener('click', signOut);
  const dialog = $('logout-confirm-dialog');
  $('logout-everywhere').addEventListener('click', () => dialog.showModal());
  $('cancel-logout').addEventListener('click', () => dialog.close());
  $('confirm-logout').addEventListener('click', async () => {
    $('confirm-logout').disabled = true;
    try { await request('/api/auth/logout-all', {method: 'POST', body: '{}'}); signOut(); }
    catch (error) { message('logout-dialog-status', error.message, true); $('confirm-logout').disabled = false; }
  });
  $('download-account-data').addEventListener('click', async () => {
    const button = $('download-account-data'); button.disabled = true; message('export-status', 'Preparing your download…');
    try {
      const [profile, scanData, draftData] = await Promise.all([request('/api/auth/me'), request('/api/scans/history'), request('/api/guidance/complaints/history')]);
      const data = {exportedAt: new Date().toISOString(), profile: profile.user, scans: scanData.scans, complaintDrafts: draftData.complaints};
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
      const link = document.createElement('a'); link.href = url; link.download = 'surakshit-gujarat-account.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      message('export-status', 'Your download is ready.');
    } catch (error) { message('export-status', error.message, true); }
    finally { button.disabled = false; }
  });
  async function start() {
    if (initialized || !window.SG?.currentUser) return;
    initialized = true; populate(window.SG.currentUser); message('profile-load-status', '');
    for (const id of ['profile-details-fields', 'password-fields', 'email-preference-fields', 'logout-everywhere', 'download-account-data']) $(id).disabled = false;
    try { $('profile-language').value = localStorage.getItem('sg_lang') || 'gu'; $('profile-font-size').value = localStorage.getItem('sg_font_size') || 'standard'; } catch {}
    await Promise.all([
      request('/api/scans/history').then(data => { scans = data.scans; renderScans(); }).catch(error => { $('citizen-scan-history').textContent = error.message; }),
      request('/api/guidance/complaints/history').then(data => { drafts = data.complaints; renderDrafts(); }).catch(error => { $('citizen-complaint-history').textContent = error.message; }),
    ]);
  }
  document.addEventListener('accountloaded', start);
  document.addEventListener('accountunavailable', () => message('profile-load-status', 'Your account could not be loaded. Refresh the page to retry.', true));
  start();
})();
