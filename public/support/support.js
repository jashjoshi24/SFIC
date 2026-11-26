;(async function(){
  const $=id=>document.getElementById(id), token=sessionStorage.getItem('citizenToken');
  if(!token){const a=document.createElement('a');a.href='/login/index.html?mode=login';a.textContent='Sign in to manage your subscriptions and contact support.';$('page-status').append(a);return;}
  async function request(path,options={}){
    const response=await fetch(window.SFIC_API_BASE_URL.replace(/\/$/,'')+'/api/auth'+path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
    const data=await response.json();if(!response.ok)throw new Error(data.message||'Request failed. Please try again.');return data;
  }
  async function history(){const data=await request('/support');$('support-history').replaceChildren();if(!data.requests.length)$('support-history').textContent='No support requests yet.';for(const r of data.requests){const div=document.createElement('div');div.className='ticket';div.textContent=`#${r.id} · ${r.subject} · ${r.status} · ${new Date(r.created_at).toLocaleDateString()}`;$('support-history').append(div);}}
  async function savePreferences(){
    $('preference-fields').disabled=true;
    try{await request('/email-preferences',{method:'PATCH',body:JSON.stringify({draftReminders:$('draft-reminders').checked,scamAlerts:$('scam-alerts').checked,cybersecurityNewsletter:$('newsletter').checked})});$('preference-status').textContent='Your email preferences have been saved.';}
    catch(e){$('preference-status').textContent=e.message;}finally{$('preference-fields').disabled=false;}
  }
  $('preferences-form').addEventListener('submit',e=>{e.preventDefault();savePreferences();});
  $('unsubscribe').addEventListener('click',()=>{for(const id of ['draft-reminders','scam-alerts','newsletter'])$(id).checked=false;savePreferences();});
  $('support-form').addEventListener('submit',async e=>{
    e.preventDefault();$('support-fields').disabled=true;$('support-status').textContent='Saving your request…';
    try{const data=await request('/support',{method:'POST',body:JSON.stringify({subject:$('subject').value,message:$('message').value})});$('support-status').textContent=`Request #${data.ticketId} saved. An acknowledgement is queued for your account email.`;$('support-form').reset();await history();}
    catch(e){$('support-status').textContent=e.message;}finally{$('support-fields').disabled=false;}
  });
  const results=await Promise.allSettled([request('/email-preferences').then(data=>{const p=data.preferences;$('draft-reminders').checked=p.draft_reminders;$('scam-alerts').checked=p.scam_alerts;$('newsletter').checked=p.cybersecurity_newsletter;$('preference-fields').disabled=false;}),history()]);
  if(results.some(r=>r.status==='rejected'))$('page-status').textContent='Some account information could not load. Refresh to retry.';
  $('support-fields').disabled=false;
})();
