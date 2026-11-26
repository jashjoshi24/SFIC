import './landing.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { content } from './content.js';

gsap.registerPlugin(ScrollTrigger);
const $=id=>document.getElementById(id);
let language='gu';try{language=window.SG?.lang?.()||localStorage.getItem('sg_lang')||'gu';}catch{}
if(!content[language])language='gu';
let scene=null,selectedSignal=0,chapter=0,paused=false,busy=false,requestController=null;
let decision = null;
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
const t=()=>content[language],frame=document.querySelector('.experience-frame'),experience=$('experience');
const copyPanels=[...document.querySelectorAll('.chapter-copy')];
const motionIcon=$('motion-toggle').querySelector('span');
const messageExample = $('message-example');
const decisionButtons = [...document.querySelectorAll('[data-decision]')];

function renderExample() {
  $('example-title').textContent = t().phone.from;
  const highlightedLine = [1, 3, 4][selectedSignal];
  const lines = t().phone.lines.map((text, index) => {
    const line = document.createElement('li');
    line.textContent = text;
    if (index === highlightedLine) {
      line.classList.add('is-highlighted');
      line.setAttribute('aria-current', 'true');
    }
    return line;
  });
  $('example-lines').replaceChildren(...lines);
}

function renderDecision() {
  $('decision-result').textContent = t().decisionResults[decision]?.body ?? '';
}

function renderCopy(){
  document.documentElement.lang=language;
  document.querySelectorAll('[data-copy]').forEach(node=>{const value=t()[node.dataset.copy];if(typeof value==='string')node.textContent=value;});
  document.querySelectorAll('[data-placeholder]').forEach(node=>{node.placeholder=t()[node.dataset.placeholder]||'';});
  $('signal-detail').textContent=t().signalDetails[selectedSignal];
  renderExample();
  renderDecision();
  for(const [id,key]of[['rotate-left','left'],['rotate-right','right'],['reset-scene','reset']])$(id).setAttribute('aria-label',t()[key]);
  $('motion-toggle').setAttribute('aria-label',t()[paused?'resume':'pause']);scene?.setCopy(t());
  if(busy)$('landing-check').querySelector('[data-copy=checkAction]').textContent=t().checking;
  const status=$('check-status');if(status.dataset.message)status.textContent=t()[status.dataset.message];
}
document.addEventListener('langchange',event=>{if(content[event.detail?.lang]){language=event.detail.lang;renderCopy();}});
renderCopy();
function setChapter(next){
  if(chapter===next&&frame.dataset.chapter===String(next))return;
  chapter=next;frame.dataset.chapter=String(next);
  messageExample.hidden = next !== 1;
  copyPanels.forEach(panel=>{const active=Number(panel.dataset.chapter)===next;panel.classList.toggle('is-active',active);panel.inert=!active;panel.setAttribute('aria-hidden',String(!active));});
  document.querySelectorAll('[data-go-chapter]').forEach(button=>{if(Number(button.dataset.goChapter)===next)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  if(!reducedQuery.matches)gsap.fromTo(copyPanels[next].querySelectorAll(':scope > .eyebrow,:scope > h1,:scope > h2,:scope > .chapter-description,:scope > .hero-actions,:scope > .signal-buttons,:scope > .signal-detail,:scope > .decision,:scope > .act-actions'),{y:18,opacity:0},{y:0,opacity:1,duration:.65,stagger:.055,ease:'power3.out',overwrite:true,clearProps:'transform,opacity'});
}
const scrollState={value:0};
function updateStory(){const value=scrollState.value;setChapter(value<.29?0:value<.77?1:2);scene?.setProgress(value);document.querySelector('.story-progress>span').style.width=`${value*100}%`;}
const timeline=gsap.to(scrollState,{value:1,ease:'none',scrollTrigger:{trigger:experience,start:'top top',end:'bottom bottom',scrub:reducedQuery.matches?true:.65,onUpdate:updateStory},onUpdate:updateStory});
function goChapter(index){const rect=experience.getBoundingClientRect(),top=scrollY+rect.top,distance=experience.offsetHeight-innerHeight;window.scrollTo({top:top+distance*[0,.53,.95][index],behavior:reducedQuery.matches?'instant':'smooth'});}
document.querySelectorAll('[data-go-chapter],[data-next-chapter]').forEach(control => {
  control.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goChapter(Number(control.dataset.goChapter ?? control.dataset.nextChapter));
  });
});
document.querySelectorAll('[data-signal]').forEach(button=>button.addEventListener('click',()=>{
  selectedSignal=Number(button.dataset.signal);scene?.setSignal(selectedSignal, true);$('signal-detail').textContent=t().signalDetails[selectedSignal];
  renderExample();
  document.querySelectorAll('[data-signal]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
}));
for (const button of decisionButtons) {
  button.addEventListener('click', () => {
    decision = button.dataset.decision;
    frame.dataset.decision = decision;
    decisionButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    renderDecision();
    scene?.setDecision(decision, true);
  });
}
$('rotate-left').addEventListener('click',()=>scene?.rotate(-.25));$('rotate-right').addEventListener('click',()=>scene?.rotate(.25));$('reset-scene').addEventListener('click',()=>scene?.reset());
$('motion-toggle').addEventListener('click',()=>{paused=!paused;scene?.setPaused(paused);$('motion-toggle').setAttribute('aria-pressed',String(paused));$('motion-toggle').setAttribute('aria-label',t()[paused?'resume':'pause']);motionIcon.textContent=paused?'play_arrow':'pause';});
function setReduced(){scene?.setReduced(reducedQuery.matches);timeline.scrollTrigger?.getTween()?.duration(reducedQuery.matches?0:.65);}
reducedQuery.addEventListener('change',setReduced);
function sceneUnavailable() {
  scene = null;
  document.body.classList.add('scene-unavailable');
  const root = $('scene-root');
  root.querySelector('.scene-loading')?.remove();
  root.querySelector('canvas')?.remove();
  root.querySelector('.scene-fallback').hidden = false;
}

let leaving = false;
async function initializeScene() {
  try {
    const { createScene } = await import('./scene.js');
    const nextScene = await createScene($('scene-root'), t(), sceneUnavailable);
    if (leaving) {
      nextScene?.dispose();
      return;
    }
    if (!nextScene) {
      sceneUnavailable();
      return;
    }
    scene = nextScene;
    scene.setCopy(t());
    scene.setProgress(scrollState.value);
    scene.setSignal(selectedSignal);
    scene.setDecision(decision);
    scene.setPaused(paused);
    scene.setReduced(reducedQuery.matches);
  } catch (error) {
    console.error('Interactive scene unavailable', error);
    sceneUnavailable();
  }
}
initializeScene();
if(!reducedQuery.matches)gsap.fromTo(copyPanels[0].querySelectorAll('.eyebrow,h1,.chapter-description,.hero-actions,.independent-note'),{y:28,opacity:0},{y:0,opacity:1,duration:1.05,stagger:.11,delay:.12,ease:'power3.out',clearProps:'transform,opacity'});
const cards = [...document.querySelectorAll('.tool-card')];
const sectionMotion = gsap.matchMedia();
sectionMotion.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.fromTo('#landing-check', { '--scan-position': '-18%' }, {
    '--scan-position': '118%',
    ease: 'none',
    scrollTrigger: { trigger: '#landing-check', start: 'top 97%', end: 'top 39%', scrub: true },
  });
  for (const [trigger, targets] of [
    ['#try', '#try > .eyebrow, #try-heading, #try > .section-description, #landing-check'],
    ['.join-section', '.join-section > div, .join-section > a'],
  ]) {
    gsap.from(targets, {
      y: 20,
      stagger: 0.08,
      ease: 'power2.out',
      scrollTrigger: { trigger, start: 'top 95%', end: 'top 58%', scrub: true },
    });
  }
  for (const [index, card] of cards.entries()) {
    gsap.from(card.querySelector('.tool-art'), {
      y: 30,
      rotationY: index === 1 ? 23 : -34,
      opacity: 0.35,
      ease: 'power2.out',
      scrollTrigger: { trigger: card, start: 'top 96%', end: 'top 63%', scrub: true },
    });
  }
});
sectionMotion.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)', () => {
  const controller = new AbortController();
  for (const card of cards) {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--tilt-x', `${(0.5 - y) * 19}deg`);
      card.style.setProperty('--tilt-y', `${(x - 0.5) * 24}deg`);
    }, { signal: controller.signal });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
    }, { signal: controller.signal });
  }
  return () => controller.abort();
});
document.fonts.ready.then(()=>ScrollTrigger.refresh());

function status(key){$('check-status').dataset.message=key;$('check-status').textContent=t()[key];}
function showResult(data){
  const box=$('check-result'),result=data.result||{};
  box.hidden=false;box.querySelector('h3').textContent=`${t().resultTitle}${result.riskLevel?' · '+result.riskLevel:''}`;
  box.querySelector('p').textContent=typeof data.guidance==='string'?data.guidance:t().resultUnknown;
  const list=box.querySelector('ul');list.replaceChildren();
  if(Array.isArray(result.indicators))for(const indicator of result.indicators){const text=typeof indicator==='string'?indicator:indicator?.description||indicator?.label;if(text){const li=document.createElement('li');li.textContent=text;list.append(li);}}
  let note=box.querySelector('.result-note');if(!note){note=document.createElement('p');note.className='result-note';box.append(note);}note.textContent=t().noGuarantee;
}
$('landing-check').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;const message=$('landing-message').value.trim();if(!message){$('landing-message').focus();return;}
  $('check-result').hidden=true;$('check-auth').hidden=true;
  let token;try{token=sessionStorage.getItem('citizenToken');}catch{}
  if(!token){status('signInRequired');$('check-auth').hidden=false;return;}
  busy=true;requestController=new AbortController();const timeout=setTimeout(()=>requestController.abort(),20000);const button=event.currentTarget.querySelector('button[type=submit]');button.disabled=true;event.currentTarget.setAttribute('aria-busy','true');status('checking');
  try{
    const api=(window.SFIC_API_BASE_URL||'http://localhost:5000').replace(/\/$/,'');
    const response=await fetch(`${api}/api/scans/message`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({message}),signal:requestController.signal});
    const data=await response.json().catch(()=>null);
    if(response.status===401||response.status===403){status('expired');$('check-auth').hidden=false;return;}
    if(!response.ok||!data?.success)throw new Error('Check failed');
    $('check-status').textContent='';delete $('check-status').dataset.message;showResult(data);
  }catch{status('failed');}
  finally{clearTimeout(timeout);busy=false;button.disabled=false;$('landing-check').removeAttribute('aria-busy');requestController=null;renderCopy();}
});
window.addEventListener('pagehide',event=>{if(event.persisted)return;leaving=true;scene?.dispose();timeline.scrollTrigger?.kill();timeline.kill();sectionMotion.revert();reducedQuery.removeEventListener('change',setReduced);requestController?.abort();});
