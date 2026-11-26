;(async function () {
  'use strict';
  const base = (window.SFIC_API_BASE_URL || '').replace(/\/$/, '');
  const token = sessionStorage.getItem('sfic_admin_token');
  if (!token) return;
  const $ = id => document.getElementById(id);
  const statuses = ['Pending', 'Under Review', 'Resolved', 'Rejected'];
  let page = 1, pages = 1, visibleScans = [], scanRequest = 0, detailRequest = 0;
  let applied = {id: '', type: '', risk: ''};
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  const date = value => value ? new Date(value).toLocaleString('en-IN') : '—';
  const count = value => Number(value || 0).toLocaleString('en-IN');
  function badge(value) {
    const el = node('span', value || 'Unknown', 'admin-badge');
    el.dataset.level = String(value).toLowerCase().replace(/ /g, '-');
    return el;
  }
  async function request(path) {
    const response = await fetch(`${base}/api/admin${path}`, {headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(20000)});
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem('sfic_admin_token');
      sessionStorage.removeItem('sfic_admin');
      window.location.replace('/admin/login.html');
      throw new Error('Your session has expired. Please sign in again.');
    }
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load activity.');
    return data;
  }
  const errorText = error => ['TypeError', 'TimeoutError'].includes(error.name)
    ? 'The server could not be reached. Please try Refresh again.' : error.message;
  function queueFilter(status) {
    location.href = `/admin/complaints.html?status=${encodeURIComponent(status)}`;
  }
  async function loadQueue() {
    if (!$("admin-complaint-queue")) return;
    try {
      const results = await Promise.all(statuses.map(status => request(`/complaints?${new URLSearchParams({status, limit: 1})}`)));
      $('admin-complaint-queue').replaceChildren(...statuses.map((status, i) => {
        const card = node('button', null, 'admin-metric queue-card');
        card.type = 'button';
        card.append(badge(status), node('strong', count(results[i].pagination.total)), node('span', 'Review drafts →', 'admin-muted'));
        card.setAttribute('aria-label', `Review ${status} complaints (${results[i].pagination.total})`);
        card.addEventListener('click', () => queueFilter(status));
        return card;
      }));
    } catch (error) { $('admin-complaint-queue').textContent = errorText(error); }
  }
  async function loadOverview() {
    if (!$("admin-live-summary")) return;
    $('refreshActivity').disabled = true;
    $('activityUpdated').textContent = 'Updating…';
    try {
      const activity = await request('/dashboard/stats');
      const stats = activity.stats;
      const metrics = [
        ['Total scans', stats.total_scans, 'Across all recorded activity'],
        ['High risk scans', stats.high_risk, 'Prioritize these for investigation'],
        ['Safe scans', stats.safe_scans, 'No major risk signals detected'],
        ['Complaint drafts', stats.total_complaints, 'Citizen reports awaiting review or closed']
      ];
      $('admin-live-summary').replaceChildren(...metrics.map(([label, value, hint]) => {
        const card = node('div', null, 'admin-metric');
        card.append(node('span', label, 'admin-muted'), node('strong', count(value)), node('span', hint, 'admin-muted'));
        return card;
      }));
      $('activityUpdated').textContent = `Updated ${new Date().toLocaleTimeString('en-IN')}`;
    } catch (error) {
      $('activityUpdated').textContent = errorText(error);
      if (!$('admin-live-summary').querySelector('.admin-metric')) $('admin-live-summary').textContent = 'Overview unavailable. Use Refresh to retry.';
    } finally { $('refreshActivity').disabled = false; }
  }
  async function loadScans() {
    if (!$("admin-live-scans")) return;
    const version = ++scanRequest;
    $('scanMessage').textContent = 'Loading scans…';
    $('exportScans').disabled = true;
    $('scanPrevious').disabled = true;
    $('scanNext').disabled = true;
    $('admin-live-scans').replaceChildren();
    visibleScans = [];
    const params = new URLSearchParams({page, limit: 10});
    for (const [key, value] of Object.entries(applied)) if (value) params.set(key, value);
    try {
      const data = await request(`/scans?${params}`);
      if (version !== scanRequest) return;
      visibleScans = data.scans;
      pages = Math.max(1, data.pagination.total_pages);
      $('scanMessage').textContent = visibleScans.length ? `${count(data.pagination.total)} matching scans · newest first` : 'No scans match these filters. Try another ID or reset the filters.';
      $('scanPageInfo').textContent = `Page ${page} of ${pages}`;
      $('scanPrevious').disabled = page <= 1;
      $('scanNext').disabled = page >= pages;
      $('exportScans').disabled = !visibleScans.length;
      if (!visibleScans.length) return;
      const table = node('table', null, 'admin-table');
      const headings = table.createTHead().insertRow();
      for (const label of ['ID', 'Type', 'Risk', 'Score', 'Created', 'Action']) headings.append(node('th', label));
      const body = table.createTBody();
      for (const scan of visibleScans) {
        const row = body.insertRow();
        row.insertCell().textContent = `#${scan.id}`;
        row.insertCell().textContent = scan.scan_type;
        row.insertCell().append(badge(scan.risk_level));
        row.insertCell().textContent = `${scan.risk_score}/100`;
        row.insertCell().textContent = date(scan.created_at);
        const button = node('button', 'Inspect', 'admin-button secondary');
        button.type = 'button';
        button.setAttribute('aria-label', `Inspect scan ${scan.id}`);
        button.addEventListener('click', () => openScan(scan.id));
        row.insertCell().append(button);
      }
      $('admin-live-scans').append(table);
    } catch (error) {
      if (version !== scanRequest) return;
      $('scanMessage').textContent = errorText(error);
      $('scanPageInfo').textContent = 'Scan history unavailable';
    }
  }
  function field(label, value) {
    const block = node('div', null, 'admin-detail-field');
    block.append(node('dt', label, 'admin-muted'), node('dd', value == null || value === '' ? '—' : String(value)));
    return block;
  }
  async function openScan(id) {
    const version = ++detailRequest;
    const dialog = $('scanDetailsDialog');
    $('scanDetailTitle').textContent = `Scan #${id}`;
    $('scanDetailsContent').textContent = 'Loading scan details…';
    dialog.showModal();
    try {
      const data = await request(`/scans/${id}`);
      if (version !== detailRequest || !dialog.open) return;
      const scan = data.scan;
      const list = node('dl', null, 'admin-detail-grid');
      for (const [label, value] of [['Type', scan.scan_type], ['Risk', scan.risk_level], ['Score', `${scan.risk_score}/100`], ['Analysis', scan.analysis_status], ['Created', date(scan.created_at)]]) list.append(field(label, value));
      const heading = node('h3', 'Risk indicators');
      const indicators = node('ul', null, 'admin-indicators');
      let values = scan.indicators;
      if (typeof values === 'string') { try { values = JSON.parse(values); } catch { values = [values]; } }
      if (!Array.isArray(values)) values = values ? [values] : [];
      if (!values.length) indicators.append(node('li', 'No risk indicators recorded.'));
      for (const indicator of values) {
        const description = indicator && typeof indicator === 'object'
          ? indicator.label || indicator.description || indicator.message || 'Risk signal detected'
          : indicator;
        indicators.append(node('li', description));
      }
      const related = node('div', null, 'admin-related');
      related.append(node('h3', `Related complaint drafts (${data.related_complaints.length})`));
      if (!data.related_complaints.length) related.append(node('p', 'No complaint drafts linked to this scan.', 'admin-muted'));
      for (const complaint of data.related_complaints) {
        const button = node('button', `Review complaint #${complaint.id} · ${complaint.status || 'Pending'}`, 'admin-button secondary');
        button.type = 'button';
        button.addEventListener('click', () => {
          dialog.close();
          location.href = `/admin/complaints.html?id=${encodeURIComponent(complaint.id)}`;
        });
        related.append(button);
      }
      $('scanDetailsContent').replaceChildren(list, heading, indicators, related);
    } catch (error) {
      if (version === detailRequest && dialog.open) $('scanDetailsContent').textContent = errorText(error);
    }
  }
  $('scanFilters').addEventListener('submit', event => {
    event.preventDefault();
    applied = {id: $('scanId').value.trim(), type: $('scanType').value, risk: $('scanRisk').value};
    page = 1;
    loadScans();
  });
  $('resetScans').addEventListener('click', () => {
    $('scanFilters').reset();
    applied = {id: '', type: '', risk: ''};
    page = 1;
    loadScans();
  });
  $('scanPrevious').addEventListener('click', () => { if (page > 1) {page--; loadScans();} });
  $('scanNext').addEventListener('click', () => { if (page < pages) {page++; loadScans();} });
  $('closeScanDetails').addEventListener('click', () => $('scanDetailsDialog').close());
  $('exportScans').addEventListener('click', () => {
    // Quote every CSV cell and neutralize spreadsheet formulas in textual values.
    const csvCell = value => {
      let text = String(value ?? '');
      if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = [['ID', 'Type', 'Risk level', 'Risk score', 'Analysis status', 'Created (ISO)'], ...visibleScans.map(s => [s.id, s.scan_type, s.risk_level, s.risk_score, s.analysis_status, s.created_at])];
    const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map(row => row.map(csvCell).join(',')).join('\r\n')], {type: 'text/csv;charset=utf-8'}));
    const link = node('a');
    link.href = url;
    link.download = `scan-history-page-${page}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('scanMessage').textContent = `Exported ${visibleScans.length} visible scans. Other pages are excluded.`;
  });
  $('refreshActivity')?.addEventListener('click', () => { loadOverview(); loadQueue(); loadScans(); });
  document.addEventListener('admin:complaint-updated', () => { loadQueue(); loadOverview(); });
  await Promise.allSettled([loadOverview(), loadQueue(), loadScans()]);
})();
