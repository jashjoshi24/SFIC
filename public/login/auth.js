;(function(){
  'use strict';
  const copy={
    gu:{headerNote:'નાગરિકોની ડિજિટલ સુરક્ષા માટેનું સ્વતંત્ર પ્લેટફોર્મ',introFirst:'સુરક્ષિત શરૂઆત',introAccent:'અહીંથી.',registerIntroFirst:'સુરક્ષિત ડિજિટલ',registerIntroAccent:'સફર શરૂ કરો.',benefitOne:'ઓનલાઇન જોખમોથી તમારી અને તમારા પરિવારની સુરક્ષા.',benefitOneSub:'Stay safe from online risks.',benefitTwo:'સરળ માર્ગદર્શનથી ડિજિટલ રીતે વધુ સુરક્ષિત બનો.',benefitTwoSub:'Be safer online with simple guidance.',loginTab:'લોગિન',registerTab:'નોંધણી',loginTitle:'પાછા આવવા બદલ સ્વાગત',loginDesc:'તમારી સુરક્ષા તપાસ ચાલુ રાખવા માટે લોગિન કરો.',registerTitle:'નવું ખાતું બનાવો',registerDesc:'તમારું સુરક્ષિત ગુજરાત નાગરિક ખાતું બનાવો.',email:'ઈમેઇલ સરનામું / Email address',password:'પાસવર્ડ / Password',name:'પૂર્ણ નામ / Full name',createPassword:'પાસવર્ડ બનાવો / Create password',confirmPassword:'પાસવર્ડની પુષ્ટિ કરો / Confirm password',emailPlaceholder:'તમારું ઈમેઇલ સરનામું દાખલ કરો',passwordPlaceholder:'તમારો પાસવર્ડ દાખલ કરો',namePlaceholder:'તમારું પૂર્ણ નામ દાખલ કરો',createPlaceholder:'પાસવર્ડ બનાવો',confirmPlaceholder:'પાસવર્ડ ફરીથી દાખલ કરો',passwordHint:'ઓછામાં ઓછા 8 અક્ષરો.',loginAction:'લોગિન કરો',registerAction:'ખાતું બનાવો',adminLogin:'એડમિન તરીકે લોગિન કરો',existingAccount:'પહેલેથી જ ખાતું છે?',signIn:'લોગિન કરો',supportBefore:'સહાય માટે',supportAfter:'પર સંપર્ક કરો',independent:'નાગરિકો માટે સ્વતંત્ર સાયબર સુરક્ષા માર્ગદર્શન. આ સરકારી કે પોલીસ સેવા નથી.',showPassword:'પાસવર્ડ બતાવો',hidePassword:'પાસવર્ડ છુપાવો',loginBusy:'લોગિન થઈ રહ્યું છે…',registerBusy:'ખાતું બની રહ્યું છે…',mismatch:'બંને પાસવર્ડ સરખા હોવા જોઈએ.',length:'પાસવર્ડ 8 થી 72 અક્ષરનો હોવો જોઈએ.',failed:'વિનંતી નિષ્ફળ ગઈ. ફરી પ્રયાસ કરો.',network:'સર્વર સાથે સંપર્ક થઈ શક્યો નથી. ફરી પ્રયાસ કરો.',sessionFailed:'લોગિન સત્ર સાચવી શકાયું નથી. બ્રાઉઝરમાં સત્ર સ્ટોરેજ ચાલુ છે કે નહીં તે તપાસો.',timeout:'સર્વરે જવાબ આપવામાં વધુ સમય લીધો. ફરી પ્રયાસ કરો.'},
    hi:{headerNote:'नागरिकों की डिजिटल सुरक्षा के लिए स्वतंत्र मंच',introFirst:'सुरक्षित शुरुआत',introAccent:'यहाँ से।',registerIntroFirst:'सुरक्षित डिजिटल',registerIntroAccent:'सफ़र शुरू करें।',benefitOne:'ऑनलाइन जोखिमों से अपनी और अपने परिवार की सुरक्षा।',benefitOneSub:'Stay safe from online risks.',benefitTwo:'सरल मार्गदर्शन से डिजिटल दुनिया में सुरक्षित रहें।',benefitTwoSub:'Be safer online with simple guidance.',loginTab:'लॉगिन',registerTab:'पंजीकरण',loginTitle:'वापस आने पर स्वागत है',loginDesc:'अपनी सुरक्षा जाँच जारी रखने के लिए लॉगिन करें।',registerTitle:'नया खाता बनाएँ',registerDesc:'अपना सुरक्षित गुजरात नागरिक खाता बनाएँ।',email:'ईमेल पता / Email address',password:'पासवर्ड / Password',name:'पूरा नाम / Full name',createPassword:'पासवर्ड बनाएँ / Create password',confirmPassword:'पासवर्ड की पुष्टि करें / Confirm password',emailPlaceholder:'अपना ईमेल पता दर्ज करें',passwordPlaceholder:'अपना पासवर्ड दर्ज करें',namePlaceholder:'अपना पूरा नाम दर्ज करें',createPlaceholder:'पासवर्ड बनाएँ',confirmPlaceholder:'पासवर्ड फिर से दर्ज करें',passwordHint:'कम से कम 8 अक्षर।',loginAction:'लॉगिन करें',registerAction:'खाता बनाएँ',adminLogin:'एडमिन लॉगिन',existingAccount:'पहले से खाता है?',signIn:'लॉगिन करें',supportBefore:'सहायता के लिए',supportAfter:'पर संपर्क करें',independent:'नागरिकों के लिए स्वतंत्र साइबर सुरक्षा मार्गदर्शन। यह सरकारी या पुलिस सेवा नहीं है।',showPassword:'पासवर्ड दिखाएँ',hidePassword:'पासवर्ड छिपाएँ',loginBusy:'लॉगिन हो रहा है…',registerBusy:'खाता बन रहा है…',mismatch:'दोनों पासवर्ड समान होने चाहिए।',length:'पासवर्ड 8 से 72 अक्षरों का होना चाहिए।',failed:'अनुरोध विफल हुआ। फिर प्रयास करें।',network:'सर्वर से संपर्क नहीं हो सका। फिर प्रयास करें।',sessionFailed:'लॉगिन सत्र सहेजा नहीं जा सका। ब्राउज़र का सत्र स्टोरेज जाँचें।',timeout:'सर्वर ने उत्तर देने में अधिक समय लिया। फिर प्रयास करें।'},
    en:{headerNote:'Independent guidance for safer digital lives',introFirst:'A safer start.',introAccent:'Right here.',registerIntroFirst:'Your safer digital',registerIntroAccent:'journey starts here.',benefitOne:'Protect yourself and your family from online risks.',benefitOneSub:'Practical help for everyday digital life.',benefitTwo:'Build safer habits with simple guidance.',benefitTwoSub:'Understand the warning signs. Know your next step.',loginTab:'Sign in',registerTab:'Register',loginTitle:'Welcome back',loginDesc:'Sign in to continue your safety checks.',registerTitle:'Create your account',registerDesc:'Create your Surakshit Gujarat citizen account.',email:'Email address',password:'Password',name:'Full name',createPassword:'Create password',confirmPassword:'Confirm password',emailPlaceholder:'Enter your email address',passwordPlaceholder:'Enter your password',namePlaceholder:'Enter your full name',createPlaceholder:'Create a password',confirmPlaceholder:'Enter your password again',passwordHint:'At least 8 characters.',loginAction:'Sign in',registerAction:'Create account',adminLogin:'Administrator access',existingAccount:'Already have an account?',signIn:'Sign in',supportBefore:'For support, call',supportAfter:'',independent:'Independent cyber safety guidance for citizens. This is not a government or police service.',showPassword:'Show password',hidePassword:'Hide password',loginBusy:'Signing in…',registerBusy:'Creating account…',mismatch:'Both passwords must match.',length:'Your password must contain 8 to 72 characters.',failed:'The request failed. Please try again.',network:'Could not reach the server. Please try again.',sessionFailed:'Your sign-in session could not be saved. Check that session storage is available in your browser.',timeout:'The server took too long to respond. Please try again.'}
  };
  const $=id=>document.getElementById(id);
  let language=window.SG?.lang?.()||'gu',mode=new URLSearchParams(location.search).get('mode')==='register'?'register':'login';
  let busy=false;
  const t=()=>copy[language]||copy.gu;
  const tabs=[$('tab-pwd'),$('tab-reg')];
  function render(){
    document.querySelectorAll('[data-copy]').forEach(node=>{node.textContent=t()[node.dataset.copy]||'';});
    document.querySelectorAll('[data-placeholder]').forEach(node=>{node.placeholder=t()[node.dataset.placeholder]||'';});
    document.querySelector('[data-copy=introFirst]').textContent=t()[mode==='register'?'registerIntroFirst':'introFirst'];
    document.querySelector('[data-copy=introAccent]').textContent=t()[mode==='register'?'registerIntroAccent':'introAccent'];
    $('form-title').textContent=t()[mode+'Title'];$('form-desc').textContent=t()[mode+'Desc'];
    document.querySelector('.auth-form-column').dataset.mode=mode;
    for(const [i,name] of ['login','register'].entries()){
      const selected=mode===name;tabs[i].setAttribute('aria-selected',String(selected));tabs[i].tabIndex=selected?0:-1;
      const panel=$(name==='login'?'form-pwd-view':'form-reg-view');panel.hidden=!selected;panel.classList.toggle('hidden',!selected);
      $(name+'-footer').hidden=!selected;
    }
    document.querySelectorAll('[data-password]').forEach(button=>{button.setAttribute('aria-label',t()[$(button.dataset.password).type==='password'?'showPassword':'hidePassword']);});
    document.title=`Surakshit Gujarat | ${mode==='login'?t().loginTab:t().registerTab}`;
    if(busy)$(mode==='login'?'btn-login':'btn-register').querySelector('[data-copy]').textContent=t()[mode+'Busy'];
    document.querySelectorAll('[data-error-code]').forEach(node=>{node.textContent=t()[node.dataset.errorCode]||t().failed;});
  }
  function clearMessages(){for(const id of ['login-message','register-message']){$(id).textContent='';delete $(id).dataset.errorCode;}}
  function setMode(next,focus=false){if(busy)return;mode=next;clearMessages();render();const url=new URL(location.href);url.searchParams.set('mode',mode);history.replaceState(null,'',url);if(focus)tabs[mode==='login'?0:1].focus();}
  tabs[0].addEventListener('click',()=>setMode('login'));tabs[1].addEventListener('click',()=>setMode('register'));
  tabs.forEach(tab=>tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();setMode(event.key==='Home'?'login':event.key==='End'?'register':mode==='login'?'register':'login',true);}}));
  document.querySelector('[data-switch-login]').addEventListener('click',event=>{event.preventDefault();setMode('login',true);});
  document.addEventListener('langchange',event=>{if(copy[event.detail?.lang]){language=event.detail.lang;render();}});
  document.querySelectorAll('[data-password]').forEach(button=>button.addEventListener('click',()=>{const field=$(button.dataset.password),show=field.type==='password';field.type=show?'text':'password';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',t()[show?'hidePassword':'showPassword']);button.querySelector('span').textContent=show?'visibility_off':'visibility';}));
  function error(id,code){$(id).dataset.errorCode=code;$(id).textContent=t()[code];}
  const base=(window.SFIC_API_BASE_URL||(['localhost','127.0.0.1'].includes(location.hostname)?'http://localhost:5000':'https://sfic-backend-7957075383.asia-south1.run.app')).replace(/\/+$/,'').replace(/\/api(?:\/auth)?$/,'')+'/api/auth';
  async function submit(event,kind){
    event.preventDefault();if(busy)return;clearMessages();const message=$(kind+'-message');
    const payload=kind==='login'?{email:$('login-identifier').value.trim(),password:$('login-pwd').value}:{name:$('register-name').value.trim(),email:$('register-email').value.trim(),password:$('register-password').value};
    if(kind==='register'){
      if(payload.password!==$('register-confirm-password').value){error('register-message','mismatch');$('register-confirm-password').focus();return;}
      if(payload.password.length<8||payload.password.length>72){error('register-message','length');return;}
    }
    busy=true;tabs.forEach(tab=>tab.disabled=true);const button=$(kind==='login'?'btn-login':'btn-register');button.disabled=true;event.currentTarget.setAttribute('aria-busy','true');render();
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(`${base}/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data?.success||!data.token||!data.user){message.textContent=data?.message||t().failed;return;}
      try{sessionStorage.setItem('citizenToken',data.token);sessionStorage.setItem('citizenUser',JSON.stringify(data.user));}catch{error(kind+'-message','sessionFailed');return;}
      const tool = new URLSearchParams(location.search).get('tool');
      const destination = ['message', 'url', 'image'].includes(tool) ? `/app/check/${tool}/index.html` : '/app/index.html';
      location.assign(destination);
    }catch(err){error(kind+'-message',err.name==='AbortError'?'timeout':'network');}
    finally{clearTimeout(timeout);busy=false;button.disabled=false;tabs.forEach(tab=>tab.disabled=false);$(kind==='login'?'form-pwd-view':'form-reg-view').removeAttribute('aria-busy');render();}
  }
  $('form-pwd-view').addEventListener('submit',event=>submit(event,'login'));
  $('form-reg-view').addEventListener('submit',event=>submit(event,'register'));
  render();
})();
