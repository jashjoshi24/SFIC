;(function(){
  'use strict';
  const {node,request,errorText}=window.AdminUI || {};
  if(!request)return;
  const $=id=>document.getElementById(id);
  const languages=[['en','English (required)'],['gu','ગુજરાતી (optional)'],['hi','हिंदी (optional)']];
  let guides=[],editing=null,deleting=null,busy=false,loading=0;
  const title=guide=>guide.content.en.title;
  const dialog=$('guideEditor');
  for(const [lang,label] of languages){
    const details=node('details',null,'guide-translation');details.open=lang==='en';details.dataset.lang=lang;
    details.append(node('summary',label));
    const fields=node('div',null,'guide-editor-fields');
    for(const [key,text,multiline,max] of [['category','Category',false,100],['title','Title',false,200],['summary','Summary',true,1500],['warnings','Warning signs (one per line)',true,7515],['actions','What to do (one per line)',true,7515]]){
      const labelNode=node('label',text),input=node(multiline?'textarea':'input');input.id=`guide-${lang}-${key}`;input.name=input.id;input.maxLength=max;input.lang=lang;
      if(multiline)input.rows=key==='summary'?3:4;else input.type='text';
      labelNode.append(input);fields.append(labelNode);
    }
    details.append(fields);$('guideTranslationFields').append(details);
  }
  function render(){
    const language=$('guideLanguage').value,search=$('guideSearch').value.trim().toLowerCase(),deleted=$('guideVisibility').value==='deleted';
    const selected=guides.filter(g=>Boolean(g.deleted_at)===deleted).filter(g=>`${g.id} ${g.content[language]?.title || g.content.en.title} ${g.category[language] || g.category.en}`.toLowerCase().includes(search));
    $('guideMessage').textContent=`${selected.length} ${deleted?'deleted':'published'} guide(s)${selected.length?'':'. No guides match these filters.'}`;
    $('guideResults').replaceChildren();
    for(const guide of selected){
      const c=guide.content[language] || guide.content.en;
      const card=node('article',null,'guide-card');card.lang=guide.content[language]?language:'en';
      card.append(node('span',guide.category[language] || guide.category.en,'admin-badge'),node('h2',c.title),node('p',c.summary));
      if(!guide.content[language])card.append(node('p','Showing English; this translation has not been added.','admin-muted'));
      const details=node('details'),summary=node('summary','Review guide content');details.append(summary);
      for(const [heading,items] of [['Warning signs',c.warnings],['What to do',c.actions]]){
        const list=node('ul');items.forEach(item=>list.append(node('li',item)));details.append(node('strong',heading),list);
      }
      card.append(details,node('p',`Translations: ${Object.keys(guide.content).map(l=>l.toUpperCase()).join(' · ')}`,'admin-muted'));
      const actions=node('div',null,'guide-actions');
      if(deleted){
        const restore=node('button','Restore guide','admin-button');restore.type='button';restore.addEventListener('click',()=>restoreGuide(guide,restore));actions.append(restore);
      }else{
        const edit=node('button','Edit guide','admin-button');edit.type='button';edit.setAttribute('aria-label',`Edit ${title(guide)}`);edit.addEventListener('click',()=>openEditor(guide));
        const remove=node('button','Delete','admin-button secondary danger');remove.type='button';remove.setAttribute('aria-label',`Delete ${title(guide)}`);remove.addEventListener('click',()=>openDelete(guide));
        const preview=node('a','Open citizen guide ↗','admin-button secondary');preview.href=`/awareness/article/index.html?guide=${encodeURIComponent(guide.id)}`;preview.target='_blank';preview.rel='noopener';
        actions.append(edit,remove,preview);
      }
      const source=node('a','Reference source ↗','admin-button secondary');source.href=guide.source;source.target='_blank';source.rel='noopener';actions.append(source);
      card.append(actions);$('guideResults').append(card);
    }
  }
  async function load(){
    const current=++loading;$('refreshGuides').disabled=true;$('guideMessage').textContent='Loading saved guides…';
    try{const data=await request('/awareness');if(current!==loading)return;guides=data.guides;render();}
    catch(e){if(current===loading)$('guideMessage').textContent=errorText(e);}
    finally{if(current===loading)$('refreshGuides').disabled=false;}
  }
  function openEditor(guide=null){
    editing=guide;$('guideEditorForm').reset();$('guideEditorMessage').textContent='';
    $('guideEditorTitle').textContent=guide?'Edit guide':'Create guide';
    $('editorId').value=guide?.id || '';$('editorId').readOnly=Boolean(guide);
    $('editorSource').value=guide?.source || '';$('editorImage').value=guide?.image || '';
    for(const [lang] of languages){
      const c=guide?.content[lang];
      for(const key of ['category','title','summary','warnings','actions']){
        const value=key==='category'?guide?.category[lang]:c?.[key];
        $(`guide-${lang}-${key}`).value=Array.isArray(value)?value.join('\n'):value || '';
      }
    }
    dialog.showModal();(guide?$('guide-en-title'):$('editorId')).focus();
  }
  function payload(){
    const data={id:$('editorId').value.trim(),source:$('editorSource').value.trim(),image:$('editorImage').value.trim(),icon:editing?.icon || 'menu_book',category:{},content:{}};
    for(const [lang] of languages){
      const values=Object.fromEntries(['category','title','summary','warnings','actions'].map(key=>[key,$(`guide-${lang}-${key}`).value.trim()]));
      if(lang!=='en'&&Object.values(values).every(value=>!value))continue;
      data.category[lang]=values.category;
      data.content[lang]={title:values.title,summary:values.summary,warnings:values.warnings.split('\n').map(s=>s.trim()).filter(Boolean),actions:values.actions.split('\n').map(s=>s.trim()).filter(Boolean)};
    }
    if(editing)data.version=editing.version;
    return data;
  }
  $('guideEditorForm').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    busy=true;$('saveGuide').disabled=true;$('closeGuideEditor').disabled=true;$('guideEditorMessage').textContent='Saving guide…';
    try{
      const data=await request(editing?`/awareness/${encodeURIComponent(editing.id)}`:'/awareness',{method:editing?'PUT':'POST',body:JSON.stringify(payload())});
      guides=editing?guides.map(g=>g.id===data.guide.id?data.guide:g):[...guides,data.guide];
      $('guideVisibility').value='published';$('guideSearch').value='';dialog.close();render();$('guideMessage').textContent=`Saved “${data.guide.content.en.title}”. The citizen library now uses this content.`;
    }catch(e){$('guideEditorMessage').textContent=errorText(e);}
    finally{busy=false;$('saveGuide').disabled=false;$('closeGuideEditor').disabled=false;}
  });
  $('closeGuideEditor').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  function openDelete(guide){
    deleting=guide;$('guideDeleteDescription').textContent=`Delete “${title(guide)}”?`;$('guideDeleteMessage').textContent='';$('guideDeleteDialog').showModal();$('cancelDeleteGuide').focus();
  }
  $('cancelDeleteGuide').addEventListener('click',()=>$('guideDeleteDialog').close());
  $('guideDeleteDialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  $('confirmDeleteGuide').addEventListener('click',async()=>{
    if(busy||!deleting)return;
    busy=true;$('confirmDeleteGuide').disabled=true;$('cancelDeleteGuide').disabled=true;$('guideDeleteMessage').textContent='Deleting guide…';
    try{
      await request(`/awareness/${encodeURIComponent(deleting.id)}`,{method:'DELETE',body:JSON.stringify({version:deleting.version})});
      const removedTitle=title(deleting);guides=guides.map(g=>g.id===deleting.id?{...g,deleted_at:new Date().toISOString(),version:g.version+1}:g);
      $('guideDeleteDialog').close();render();$('guideMessage').textContent=`Deleted “${removedTitle}”. Use Deleted guides to restore it.`;
    }catch(e){$('guideDeleteMessage').textContent=errorText(e);}
    finally{busy=false;$('confirmDeleteGuide').disabled=false;$('cancelDeleteGuide').disabled=false;}
  });
  async function restoreGuide(guide,button){
    button.disabled=true;$('guideMessage').textContent='Restoring guide…';
    try{
      await request(`/awareness/${encodeURIComponent(guide.id)}/restore`,{method:'POST',body:JSON.stringify({version:guide.version})});
      guides=guides.map(g=>g.id===guide.id?{...g,deleted_at:null,version:g.version+1}:g);render();$('guideMessage').textContent=`Restored “${title(guide)}” to the citizen library.`;
    }catch(e){$('guideMessage').textContent=errorText(e);button.disabled=false;}
  }
  $('createGuide').addEventListener('click',()=>openEditor());$('refreshGuides').addEventListener('click',load);
  $('guideSearch').addEventListener('input',render);$('guideLanguage').addEventListener('change',render);$('guideVisibility').addEventListener('change',render);load();
})();
