;(function(){
  'use strict';
  const {request,node,table,errorText}=window.AdminUI || {};
  if(!request)return;
  const $=id=>document.getElementById(id);
  let version=0;
  function bars(container,items,total){
    container.replaceChildren();
    for(const [label,count] of items){
      const row=node('div',null,'report-bar'),labels=node('div',null,'report-bar-label'),track=node('div',null,'report-track'),fill=node('div',null,'report-fill');
      labels.append(node('span',label),node('strong',Number(count).toLocaleString('en-IN')));
      fill.style.width=`${total?Math.min(100,100*Number(count)/total):0}%`;
      track.append(fill);row.append(labels,track);container.append(row);
    }
  }
  async function load(){
    const current=++version;
    $('reportMessage').textContent='Loading activity report…';
    for(const id of ['reportTotals','reportTypes','reportRisks','reportDaily'])$(id).replaceChildren();
    try{
      const data=await request(`/reports?days=${encodeURIComponent($('reportDays').value)}`);
      if(current!==version)return;
      const t=data.totals;
      $('reportMessage').textContent=`${data.daily.at(-1).date} to ${data.daily[0].date} · India Standard Time · ${t.scans?'Recorded activity':'No scans recorded during this period'}`;
      for(const [label,key] of [['Safety checks','scans'],['High risk scans','high_risk'],['Complaint drafts','complaints'],['New citizens','registrations']]){
        const card=node('div',null,'admin-metric');card.append(node('span',label,'admin-muted'),node('strong',Number(t[key]).toLocaleString('en-IN')));$('reportTotals').append(card);
      }
      bars($('reportTypes'),[['Messages',t.messages],['URLs',t.urls],['Image / QR',t.images]],t.scans);
      bars($('reportRisks'),data.risks.map(r=>[r.level,r.count]),t.scans);
      if(!data.risks.length)$('reportRisks').textContent='No risk results recorded.';
      $('reportDaily').append(table(['Date (IST)','Scans','High risk','Complaint drafts','Registrations'],data.daily.map(d=>[d.date,d.scans,d.high_risk,d.complaints,d.registrations])));
    }catch(e){if(current===version)$('reportMessage').textContent=errorText(e);}
  }
  $('reportFilters').addEventListener('submit',e=>{e.preventDefault();load();});
  load();
})();
