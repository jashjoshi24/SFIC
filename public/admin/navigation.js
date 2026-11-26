;(function () {
  'use strict';
  const token = sessionStorage.getItem('sfic_admin_token');
  if (!token) { location.replace('/admin/login.html'); return; }
  const api = (window.SFIC_API_BASE_URL || '').replace(/\/$/, '');
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; };
  function signOut() {
    sessionStorage.removeItem('sfic_admin_token'); sessionStorage.removeItem('sfic_admin');
    location.replace('/admin/login.html');
  }
  async function request(path, options = {}) {
    const response = await fetch(`${api}/api/admin${path}`, {...options,headers:{...(options.body ? {'Content-Type':'application/json'} : {}),...options.headers,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
    if ([401,403].includes(response.status)) { signOut(); throw new Error('Please sign in again.'); }
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load data.');
    return data;
  }
  const errorText = e => ['TypeError','TimeoutError'].includes(e.name) ? 'Unable to reach the server. Please try again.' : e.message;
  function table(headings, rows) {
    const result = node('table',null,'admin-table');
    const head = result.createTHead().insertRow();
    headings.forEach(h => { const th=node('th',h); th.scope='col'; head.append(th); });
    const body=result.createTBody();
    rows.forEach(values => {const row=body.insertRow(); values.forEach(value=>row.insertCell().textContent=value ?? '—');});
    return result;
  }
  window.AdminUI = {request,node,table,errorText};
  const pages = [['index','Overview','At a glance'],['scans','Scan history','Message, URL & image checks'],['complaints','Complaint desk','Drafts, notes & history'],['citizens','Citizens','Accounts & activity'],['reports','Activity reports','Trends & risk distribution'],['awareness','Awareness library','Citizen guides & translations'],['emails','Email & support','Campaigns, delivery & requests']];
  const nav = document.querySelector('aside nav');
  if (nav) {
    nav.replaceChildren(...pages.map(([path,label,description]) => {
      const a=node('a',null,'admin-nav-link'); a.href=`/admin/${path}.html`;
      if (location.pathname.endsWith(`/${path}.html`) || path === 'index' && /\/admin\/?$/.test(location.pathname)) a.setAttribute('aria-current','page');
      a.append(node('span',label),node('small',description)); return a;
    }));
  }
  document.getElementById('adminSignOut')?.addEventListener('click',signOut);
  const menu=document.getElementById('adminMenu');
  menu?.addEventListener('click',()=>{
    const open=document.body.classList.toggle('admin-menu-open'); menu.setAttribute('aria-expanded',String(open));
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('admin-menu-open');menu?.setAttribute('aria-expanded','false');}});
  request('/me').then(data=>{
    document.querySelectorAll('#adminIdentity,[data-current-user]').forEach(el=>el.textContent=data.admin.name);
  }).catch(e=>{const identity=document.getElementById('adminIdentity');if(identity)identity.textContent=errorText(e);});
})();
