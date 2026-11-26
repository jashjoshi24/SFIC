/** Surakshit Gujarat — dictionary-based website translation engine. */
(function () {
  'use strict';
  const STORAGE_KEY = 'sg_lang';
  const VALID_LANGS = ['gu', 'hi', 'en'];
  const SG = window.SG = window.SG || {};
  if (SG.translationEngineReady) return;
  SG.translationEngineReady = true;
  let active = 'gu';
  try { const saved = localStorage.getItem(STORAGE_KEY); if (VALID_LANGS.includes(saved)) active = saved; } catch (_) {}
  const getLang = () => active;
  const normalize = s => s.trim().replace(/\s+/g, ' ');
  let cachedDict, index = new Map();
  function getIndex() {
    const dict = window.SG_TRANSLATIONS || EMPTY;
    if (cachedDict === dict) return index;
    cachedDict = dict;
    index = new Map();
    const aliases = [];
    for (const [key, entry] of Object.entries(dict)) {
      if (!entry || typeof entry !== 'object') continue;
      const values = {gu: entry.gu || (/\p{Script=Gujarati}/u.test(key) ? key : null), hi: entry.hi, en: entry.en};
      index.set(normalize(key), values);
      aliases.push([values, [values.gu, values.hi, values.en]]);
    }
    // Explicit source phrases take priority over ambiguous translated aliases.
    for (const [values, phrases] of aliases) {
      for (const alias of phrases) {
        if (typeof alias !== 'string' || !alias.trim()) continue;
        const k = normalize(alias);
        if (!index.has(k)) index.set(k, values);
      }
    }
    return index;
  }
  const EMPTY = Object.freeze({});
  function translateTemplate(text, lang) {
    for (const entry of window.SG_TRANSLATION_TEMPLATES || []) {
      for (const source of Object.values(entry)) {
        const names = [];
        const pattern = source.split(/(\{\w+\})/).map(part => {
          if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return '(.+?)'; }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('');
        const match = text.match(new RegExp('^' + pattern + '$'));
        if (match && entry[lang]) return entry[lang].replace(/\{(\w+)\}/g, (_, name) => {
          const value = match[names.indexOf(name) + 1];
          return ['count', 'score'].includes(name) ? convertDigits(value, lang) : value;
        });
      }
    }
    return null;
  }
  function convertDigits(text, lang) {
    // Avoid changing identifiers, URLs, phone numbers or unrecognized user data.
    if (lang === 'gu') return text;
    return text.replace(/[૦-૯०-९]/g, digit => {
      const code = digit.charCodeAt(0);
      const n = code >= 0x0AE6 ? code - 0x0AE6 : code - 0x0966;
      return lang === 'hi' ? String.fromCharCode(0x0966 + n) : String(n);
    });
  }
  function translateString(text, lang = active) {
    if (typeof text !== 'string' || !VALID_LANGS.includes(lang) || !text.trim()) return text;
    const trimmed = text.trim();
    const lookup = getIndex();
    const exact = lookup.get(normalize(trimmed))?.[lang];
    if (typeof exact === 'string') return text.slice(0, text.indexOf(trimmed)) + convertDigits(exact, lang) + text.slice(text.indexOf(trimmed) + trimmed.length);
    const template = translateTemplate(normalize(trimmed), lang);
    if (template !== null) return text.replace(trimmed, () => template);
    const numbered = trimmed.match(/^([0-9૦-૯०-९]+[.)]\s+)(.+)$/);
    if (numbered) {
      const label = lookup.get(normalize(numbered[2]))?.[lang];
      if (typeof label === 'string') return text.replace(trimmed, () => convertDigits(numbered[1], lang) + label);
    }
    // A label may include an icon or punctuation outside its catalog phrase.
    const decorated = trimmed.match(/^([^\p{L}\p{N}]*)(.+?)([:：.!…\s✕]*)$/u);
    if (decorated) {
      const target = lookup.get(normalize(decorated[2]))?.[lang];
      if (typeof target === 'string') return text.replace(trimmed, () => decorated[1] + convertDigits(target, lang) + decorated[3]);
    }
    const sentences = text.split(/((?<=[.!?।])\s+)/);
    if (sentences.length > 1) return sentences.map(part => translateString(part, lang)).join('');
    // Translate complete segments only, not arbitrary substrings inside words or URLs.
    return text.split(/(\s+[·—|]\s+|:\s+)/).map(part => {
      const key = part.trim();
      const target = lookup.get(normalize(key))?.[lang];
      if (!key || typeof target !== 'string') return part;
      const start = part.indexOf(key);
      return part.slice(0, start) + convertDigits(target, lang) + part.slice(start + key.length);
    }).join('');
  }
  const textState = new WeakMap(), attrState = new WeakMap();
  const excluded = 'script, style, noscript, textarea, pre, code, svg, [contenteditable]:not([contenteditable="false"]), [data-no-translate], [translate="no"], [data-current-user], [data-copy], [data-lang-btn], [data-dlang], .material-symbols-outlined, .material-icons';
  function skip(el) { return !el || !!el.closest(excluded); }
  function translateText(node, lang) {
    if (skip(node.parentElement) || !node.nodeValue.trim()) return;
    let state = textState.get(node);
    if (!state || node.nodeValue !== state.last) state = {source: node.nodeValue};
    const target = translateString(state.source, lang);
    state.last = target;
    textState.set(node, state);
    if (node.nodeValue !== target) node.nodeValue = target;
  }
  function translateAttr(el, attr, lang) {
    // Textarea placeholders are safe to translate; their values are never touched.
    if (el.closest(excluded.replace('textarea, ', ''))) return;
    const current = el.getAttribute(attr);
    if (current === null) return;
    let states = attrState.get(el);
    if (!states) { states = new Map(); attrState.set(el, states); }
    let state = states.get(attr);
    if (!state || current !== state.last) state = {source: current};
    const target = translateString(state.source, lang);
    state.last = target;
    states.set(attr, state);
    if (current !== target) el.setAttribute(attr, target);
  }
  const labels = new Map([['ગુજરાતી','gu'], ['हिंदी','hi'], ['हिन्दी','hi'], ['Hindi','hi'], ['English','en']]);
  const wired = new WeakSet();
  function wireButtons() {
    document.querySelectorAll('button[data-lang-btn], button[data-dlang], header button, #lang-picker button, .lang-switcher-pill button, #btn-lang-gu, #btn-lang-hi, #btn-lang-en').forEach(btn => {
      const lang = btn.dataset.langBtn || btn.dataset.dlang || labels.get(btn.textContent.trim());
      if (!VALID_LANGS.includes(lang)) return;
      btn.dataset.langBtn = lang;
      if (wired.has(btn)) return;
      wired.add(btn);
      btn.addEventListener('click', event => { event.preventDefault(); setLang(btn.dataset.langBtn); });
    });
  }
  function updateSwitcherButtons(lang) {
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      const selected = btn.dataset.langBtn === lang;
      for (const cls of ['bg-primary-container','text-on-primary-container','font-semibold','shadow-sm']) btn.classList.toggle(cls, selected);
      btn.classList.toggle('text-on-surface-variant', !selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
  }
  let observer, timer, translating = false;
  const options = {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['placeholder','title','alt','aria-label','value']};
  function translateDom(lang = active) {
    if (!VALID_LANGS.includes(lang) || translating || !document.body) return;
    translating = true;
    observer?.disconnect();
    try {
      document.documentElement.lang = lang;
      wireButtons();
      const title = document.querySelector('head title');
      if (title) for (const node of title.childNodes) if (node.nodeType === 3) translateText(node, lang);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) translateText(node, lang);
      document.querySelectorAll('[placeholder], [title], [alt], [aria-label]').forEach(el => {
        for (const attr of ['placeholder','title','alt','aria-label']) if (el.hasAttribute(attr)) translateAttr(el, attr, lang);
      });
      document.querySelectorAll('input[type="button"],input[type="submit"],input[type="reset"]').forEach(el => translateAttr(el, 'value', lang));
      updateSwitcherButtons(lang);
    } finally {
      translating = false;
      observer?.observe(document.body, options);
    }
  }
  function setLang(lang) {
    if (!VALID_LANGS.includes(lang)) return;
    const changed = active !== lang;
    active = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    translateDom(lang);
    // Only dispatch on explicit language changes, never on observer refreshes.
    if (changed) document.dispatchEvent(new CustomEvent('langchange', {detail:{lang}}));
    // Page renderers can replace text in response to langchange.
    translateDom(lang);
  }
  function init() {
    if (window.MutationObserver) {
      observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => translateDom(active), 80);
      });
    }
    translateDom(active);
    document.dispatchEvent(new CustomEvent('langchange', {detail:{lang:active}}));
    if (!window._sgAlertWrapped && typeof window.alert === 'function') {
      const nativeAlert = window.alert.bind(window);
      window.alert = message => nativeAlert(translateString(String(message), active));
      window._sgAlertWrapped = true;
    }
  }
  Object.assign(SG, {lang:getLang, setLang, translate:translateString, translateDom});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
