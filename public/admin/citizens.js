;(function(){
  'use strict';
  const {request,table,errorText}=window.AdminUI || {};
  if(!request)return;
  const $=id=>document.getElementById(id);
  let page=1,pages=1,search='',version=0;
  async function load(){
    const current=++version;
    $('citizenMessage').textContent='Loading citizen accounts…';
    $('citizenResults').replaceChildren();
    $('citizenPrevious').disabled=true; $('citizenNext').disabled=true;
    try{
      const data=await request(`/citizens?${new URLSearchParams({page,search})}`);
      if(current!==version)return;
      pages=Math.max(1,data.pagination.total_pages);
      $('citizenMessage').textContent=data.citizens.length?`${data.pagination.total} citizen account(s) found. Newest registrations first.`:'No citizen accounts match this search.';
      if(data.citizens.length)$('citizenResults').append(table(['ID','Citizen','Email','Registered','Safety checks','Complaint drafts'],data.citizens.map(c=>[c.id,c.name,c.email,new Date(c.created_at).toLocaleString('en-IN'),c.scan_count,c.complaint_count])));
      $('citizenPage').textContent=`Page ${page} of ${pages}`;
      $('citizenPrevious').disabled=page<=1; $('citizenNext').disabled=page>=pages;
    }catch(e){if(current===version){$('citizenMessage').textContent=errorText(e);$('citizenPage').textContent='Directory unavailable';}}
  }
  $('citizenFilters').addEventListener('submit',e=>{e.preventDefault();search=$('citizenSearch').value.trim();page=1;load();});
  $('citizenReset').addEventListener('click',()=>{$('citizenFilters').reset();search='';page=1;load();});
  $('citizenPrevious').addEventListener('click',()=>{if(page>1){page--;load();}});
  $('citizenNext').addEventListener('click',()=>{if(page<pages){page++;load();}});
  load();
})();
