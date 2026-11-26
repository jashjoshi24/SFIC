;(function(){
  const {request,node,table,errorText}=window.AdminUI||{};if(!request)return;
  const $ = id => document.getElementById(id);
  const form = $('campaignForm');
  const queue = $('queueCampaign');
  const send = $('sendCampaign');
  const typeField = $('campaignType');
  const tipsField = $('campaignTips');
  const preview = $('campaignPreview');
  const hint = $('campaignPreviewHint');
  const status = $('campaignStatus');
  const previewError = error => error instanceof SyntaxError
    ? 'The server returned an unexpected response. Please try again.'
    : errorText(error);
  let previewed = null;
  let revision = 0;
  let attempt = 0;
  let busy = false;
  let timer;
  let requestKey;
  let campaign;
  let deliveryFinished = false;
  let audiences = {};
  let immediateDelivery = false;

  function audienceName(type) {
    return type === 'account_announcement' ? 'all active users' : 'active users subscribed to this email type';
  }

  function updateAudience() {
    const type = typeField.value;
    const count = audiences[type];
    const label = `Recipients: ${audienceName(type)}${typeof count === 'number' ? ` (${count})` : ''}.`;
    $('campaignAudience').textContent = label;
    tipsField.required = type !== 'account_announcement';
    $('campaignTipsLabel').textContent = tipsField.required ? 'Tips / reading highlights' : 'Tips / reading highlights (optional)';
  }

  function draftHint() {
    return tipsField.required ? 'Enter a title, an introduction, and 1–5 tips to see the email preview.'
      : 'Enter a title and an introduction to see the service announcement.';
  }

  function updateActions() {
    queue.disabled = !previewed || busy || Boolean(campaign);
    send.disabled = !previewed || busy || !immediateDelivery || deliveryFinished;
    $('sendAvailability').hidden = immediateDelivery;
    $('pendingCampaigns').querySelectorAll('button[data-ready]').forEach(button => {
      button.disabled = busy || !immediateDelivery || button.dataset.ready === '0';
    });
  }

  function draft() {
    const type = typeField.value;
    const title = $('campaignTitle').value.trim();
    const summary = $('campaignSummary').value.trim();
    const tips = tipsField.value.split('\n').map(tip => tip.trim()).filter(Boolean);
    if (!title || !summary || (tipsField.required && !tips.length) || tips.length > 5 || tips.some(tip => tip.length > 300)) return null;
    return {type, title, summary, tips};
  }

  function showHint(text) {
    hint.textContent = text;
    hint.hidden = false;
    preview.hidden = true;
  }

  async function renderPreview() {
    clearTimeout(timer);
    if (busy) return;
    const current = revision;
    const latest = ++attempt;
    const data = draft();
    previewed = null;
    updateActions();
    if (!data) {
      showHint(draftHint());
      status.textContent = 'Enter the required fields. Include up to 5 tips of up to 300 characters each.';
      return;
    }
    status.textContent = 'Preparing preview…';
    if (preview.hidden) showHint(status.textContent);
    try {
      const result = await request('/emails/preview', {method:'POST', body:JSON.stringify(data)});
      if (current !== revision || latest !== attempt) return;
      if (typeof result.html !== 'string' || !result.html.trim()) throw new Error('The server returned an empty preview.');
      preview.srcdoc = result.html;
      preview.hidden = false;
      hint.hidden = true;
      previewed = data;
      updateActions();
      status.textContent = `Preview ready for ${audienceName(data.type)}.`;
    } catch (error) {
      if (current !== revision || latest !== attempt) return;
      status.textContent = previewError(error);
      showHint(status.textContent);
    }
  }

  form.addEventListener('input', () => {
    revision++;
    requestKey = undefined;
    campaign = undefined;
    deliveryFinished = false;
    previewed = null;
    updateAudience();
    updateActions();
    clearTimeout(timer);
    if (draft()) {
      status.textContent = 'Updating preview…';
      timer = setTimeout(renderPreview, 300);
    } else {
      showHint(draftHint());
      status.textContent = '';
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    renderPreview();
  });

  function summary(id, delivery) {
    return `Edition #${id}: ${delivery.accepted} accepted by Brevo, ${delivery.pending} pending, ${delivery.skipped} skipped, ${delivery.failed} failed.`;
  }

  async function sendBatches(id, onProgress) {
    let delivery;
    do {
      delivery = await request(`/emails/campaigns/${id}/send`, {method:'POST'});
      onProgress(delivery);
    } while (delivery.ready > 0 && delivery.processed > 0);
    return delivery;
  }

  async function submitCampaign(sendNow) {
    if (!previewed || busy) return;
    busy = true;
    updateActions();
    const data = previewed;
    const current = revision;
    try {
      requestKey ??= crypto.randomUUID();
      status.textContent = sendNow ? 'Starting delivery…' : 'Queueing the edition…';
      const result = campaign || await request('/emails/campaigns', {method:'POST', body:JSON.stringify({...data, requestKey, sendNow})});
      if (current === revision) campaign = result;
      if (!result.queued) {
        if (current === revision) {
          deliveryFinished = true;
          status.textContent = 'No active recipients match this email type.';
        }
      } else if (sendNow) {
        const delivery = await sendBatches(result.campaignId, progress => {
          if (current === revision) status.textContent = summary(result.campaignId, progress);
        });
        if (current === revision) deliveryFinished = delivery.pending === 0;
      } else if (current === revision) {
        status.textContent = `Edition #${result.campaignId} queued for ${result.queued} users.`;
      }
      await load();
    } catch (error) {
      if (current === revision) status.textContent = previewError(error);
    } finally {
      busy = false;
      if (current !== revision && draft()) renderPreview();
      updateActions();
    }
  }

  async function resumeCampaign(id) {
    if (busy) return;
    busy = true;
    updateActions();
    const current = revision;
    const resultStatus = $('deliveryStatus');
    resultStatus.textContent = 'Continuing delivery…';
    try {
      const delivery = await sendBatches(id, progress => { resultStatus.textContent = summary(id, progress); });
      if (String(campaign?.campaignId) === String(id)) deliveryFinished = delivery.pending === 0;
      await load();
    } catch (error) {
      resultStatus.textContent = previewError(error);
    } finally {
      busy = false;
      if (current !== revision && draft()) renderPreview();
      updateActions();
    }
  }

  function showPending(campaigns) {
    const pending = $('pendingCampaigns');
    pending.replaceChildren();
    for (const item of campaigns) {
      const row = node('div', null, 'email-request');
      const button = node('button', 'Continue sending', 'admin-button secondary');
      button.type = 'button';
      button.dataset.ready = String(item.ready);
      button.addEventListener('click', () => resumeCampaign(item.id));
      row.append(node('strong', item.title || `Edition #${item.id}`),
        node('p', `${item.pending} pending · ${item.ready} ready now`, 'admin-muted'), button);
      pending.append(row);
    }
  }

  queue.addEventListener('click', () => submitCampaign(false));
  send.addEventListener('click', () => submitCampaign(true));
  async function load(){
    $('workspaceStatus').textContent='Loading…';
    try{const data=await request('/emails');$('deliveryTable').replaceChildren(table(['Email type','Status','Messages'],data.delivery.map(r=>[r.type.replaceAll('_',' '),r.status,r.count])));$('supportRequests').replaceChildren();
      audiences = data.audiences || {};
      immediateDelivery = data.immediateDelivery === true;
      showPending(data.pendingCampaigns || []);
      updateAudience();
      updateActions();
      if(!data.support.length)$('supportRequests').textContent='No support requests yet.';
      for(const r of data.support){const div=node('div',null,'email-request');div.append(node('h3',`#${r.id} · ${r.subject}`),node('small',`${r.status} · ${new Date(r.created_at).toLocaleString()}`),node('p',r.message));if(r.status==='Open'){const b=node('button','Mark as closed','admin-button secondary');b.addEventListener('click',async()=>{b.disabled=true;try{await request(`/emails/support/${r.id}/close`,{method:'PATCH',body:'{}'});await load();}catch(e){$('workspaceStatus').textContent=errorText(e);b.disabled=false;}});div.append(b);}$('supportRequests').append(div);}
      $('workspaceStatus').textContent='Workspace updated.';
    }catch(e){$('workspaceStatus').textContent=errorText(e);}
  }
  updateAudience();
  showHint(draftHint());
  $('refreshEmails').addEventListener('click',load);load();
})();
