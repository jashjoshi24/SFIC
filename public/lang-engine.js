/**
 * Surakshit Gujarat — Full-Website Translation Engine
 * Translates 100% of visible content across every page:
 * Translates catalogued content across every page:
 * - Headings, paragraphs, spans, labels, lists, and tables
 * - Buttons, placeholders, tooltips (title), alt text, and aria-labels
 * - Digits and numerals (Gujarati ૦-૯ -> English 0-9 / Hindi ०-९)
 * - Dynamically added content via debounced MutationObserver
 * - Instant lossless restore when switching back to Gujarati
 * - Persists choice in localStorage ('sg_lang')
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'sg_lang';
  const VALID_LANGS = ['gu', 'hi', 'en'];

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || 'gu';
  }

  function setLang(lang) {
    if (!VALID_LANGS.includes(lang)) return;
    localStorage.setItem(STORAGE_KEY, lang);
    applyLang(lang);
  }

  function getDict() {
    return window.SG_TRANSLATIONS || {};
  }

  let guReverseDictionary = null;
  let guReverseSource = null;
  function getGujaratiReverseDictionary(dict) {
    if (guReverseSource === dict && guReverseDictionary) return guReverseDictionary;
    guReverseSource = dict;
    guReverseDictionary = new Map();
    // Prefer an actual Gujarati phrase when several aliases share a translation.
    for (const [gujarati, translations] of Object.entries(dict)) {
      if (!/\p{Script=Gujarati}/u.test(gujarati)) continue;
      for (const alias of [translations.en, translations.hi]) {
        if (alias && !guReverseDictionary.has(alias)) guReverseDictionary.set(alias, gujarati);
      }
    }
    return guReverseDictionary;
  }

  /* ─────────────────── DIGIT CONVERSION ─────────────────── */
  const guDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  const hiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  const enDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  function convertDigits(str, lang) {
    if (!str || typeof str !== 'string') return str;
    let res = str;
    if (lang === 'en') {
      guDigits.forEach((d, i) => {
        if (res.includes(d)) res = res.split(d).join(enDigits[i]);
      });
    } else if (lang === 'hi') {
      guDigits.forEach((d, i) => {
        if (res.includes(d)) res = res.split(d).join(hiDigits[i]);
      });
    }
    return res;
  }

  /* ─────────────────── STRING TRANSLATION ─────────────────── */
  function translateString(text, lang) {
    if (!text || typeof text !== 'string') return text;
    if (lang === 'gu') return text;

    const dict = getDict();
    const trimmed = text.trim();
    if (!trimmed) return text;

    // 1. Direct exact match
    if (dict[trimmed] && dict[trimmed][lang]) {
      return text.replace(trimmed, dict[trimmed][lang]);
    // Gujarati is the source language for most copy, but many pages contain
    // English source labels too. Resolve those through the dictionary's
    // English/Hindi values so Gujarati is applied just like the other choices.
    function lookup(phrase) {
      if (dict[phrase]?.[lang]) return dict[phrase][lang];
      if (lang === 'gu') {
        return getGujaratiReverseDictionary(dict).get(phrase) || null;
      }
      return null;
    }

    // 1. Direct exact match
    const exact = lookup(trimmed);
    if (exact) {
      return text.replace(trimmed, exact);
    }

    // 2. Normalized whitespace match
    const norm = trimmed.replace(/\s+/g, ' ');
    if (dict[norm] && dict[norm][lang]) {
      return text.replace(trimmed, dict[norm][lang]);
    const normalized = lookup(norm);
    if (normalized) {
      return text.replace(trimmed, normalized);
    }

    // 3. Delimiter-based sub-phrase match (for compounds with ·, —, :, |, etc.)
    let translated = text;
    let modified = false;

    // Check known phrases in dictionary sorted by length descending
    const keys = Object.keys(dict);
    for (let i = 0; i < keys.length; i++) {
      const phrase = keys[i];
      if (phrase.length > 2 && translated.includes(phrase)) {
        const target = dict[phrase][lang];
    const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
    for (let i = 0; i < keys.length; i++) {
      const phrase = keys[i];
      if (phrase.length > 2 && translated.includes(phrase)) {
        const target = lookup(phrase);
        if (target) {
          translated = translated.split(phrase).join(target);
          modified = true;
        }
      }
    }

    // 4. Convert digits
    translated = convertDigits(translated, lang);

    return translated;
  }

  /* ─────────────────── FULL-PAGE DOM TRANSLATION ─────────────────── */
  let isTranslating = false;

  function translateDom(lang) {
    if (isTranslating) return;
    isTranslating = true;

    try {
      const dict = getDict();
      document.documentElement.lang = lang === 'gu' ? 'gu' : lang === 'hi' ? 'hi' : 'en';
      const title = document.querySelector('head title');
      if (title) {
        if (title._origText === undefined) title._origText = title.textContent;
        title.textContent = translateString(title._origText, lang);
      }

      // 1. Walk every visible text node in document.body
      if (document.body) {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: function (node) {
              if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
              const parent = node.parentNode;
              if (!parent) return NodeFilter.FILTER_REJECT;
              const tag = parent.tagName;
              if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                return NodeFilter.FILTER_REJECT;
              }
              if (parent.closest?.('[data-lang-btn], .material-symbols-outlined, [aria-hidden="true"]')) {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let node;
        while ((node = walker.nextNode())) {
          // Cache original Gujarati baseline text
          if (node._origText === undefined) {
            node._origText = node.nodeValue;
          }

          if (lang === 'gu') {
            if (node.nodeValue !== node._origText) {
              node.nodeValue = node._origText;
            }
          } else {
            const translated = translateString(node._origText, lang);
            if (translated && node.nodeValue !== translated) {
              node.nodeValue = translated;
            }
          }
          // Keep the app's newest source text when it updates a live label,
          // while retaining the original so language switches stay reversible.
          if (node._origText === undefined ||
              (node._lastTranslated !== undefined && node.nodeValue !== node._lastTranslated)) {
            node._origText = node.nodeValue;
          }

          const translated = translateString(node._origText, lang);
          if (translated && node.nodeValue !== translated) node.nodeValue = translated;
          node._lastTranslated = translated;
        }

        // 2. Translate Input and Textarea Placeholders
        document.querySelectorAll('input, textarea').forEach(el => {
          if (el.placeholder) {
            if (el._origPlaceholder === undefined) {
              el._origPlaceholder = el.placeholder;
            }
            if (lang === 'gu') {
              el.placeholder = el._origPlaceholder;
            } else {
              el.placeholder = translateString(el._origPlaceholder, lang);
            }
            el.placeholder = translateString(el._origPlaceholder, lang);
          }
        });

        // 3. Translate Tooltip Titles, Alt text, and Aria Labels
        document.querySelectorAll('[title], [alt], [aria-label]').forEach(el => {
          if (el.title) {
            if (el._origTitle === undefined) el._origTitle = el.title;
            el.title = lang === 'gu' ? el._origTitle : translateString(el._origTitle, lang);
          }
          if (el.alt) {
            if (el._origAlt === undefined) el._origAlt = el.alt;
            el.alt = lang === 'gu' ? el._origAlt : translateString(el._origAlt, lang);
          }
          if (el.getAttribute('aria-label')) {
            if (el._origAriaLabel === undefined) el._origAriaLabel = el.getAttribute('aria-label');
            el.setAttribute('aria-label', lang === 'gu' ? el._origAriaLabel : translateString(el._origAriaLabel, lang));
          }
        });
            el.title = translateString(el._origTitle, lang);
          }
          if (el.alt) {
            if (el._origAlt === undefined) el._origAlt = el.alt;
            el.alt = translateString(el._origAlt, lang);
          }
          if (el.getAttribute('aria-label')) {
            if (el._origAriaLabel === undefined) el._origAriaLabel = el.getAttribute('aria-label');
            el.setAttribute('aria-label', translateString(el._origAriaLabel, lang));
          }
        });

        // Only translate button-like input values; preserve user-entered values.
        document.querySelectorAll('input[type="button"], input[type="submit"], input[type="reset"]').forEach(el => {
          if (!el.value) return;
          if (el._origValue === undefined) el._origValue = el.value;
          el.value = translateString(el._origValue, lang);
        });
      }

      // 4. Update Header Language Switcher Buttons
      updateSwitcherButtons(lang);

      // 5. Dispatch langchange event for specific module controllers
      document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    } finally {
      isTranslating = false;
    }
  }

  function updateSwitcherButtons(lang) {
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      const btnLang = btn.getAttribute('data-lang-btn');
      if (btnLang === lang) {
        btn.classList.add('bg-primary-container', 'text-on-primary-container', 'font-semibold', 'shadow-sm');
        btn.classList.remove('text-on-surface-variant');
      } else {
        btn.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-semibold', 'shadow-sm');
        btn.classList.add('text-on-surface-variant');
      }
    });
  }

  /* ─────────────────── WIRE LANGUAGE BUTTONS ─────────────────── */
  function wireButtons() {
    const langBtnGroups = document.querySelectorAll(
      '.flex.items-center.p-1.rounded-full.bg-surface-raised, .lang-switcher-pill'
    );

    langBtnGroups.forEach(group => {
      const btns = group.querySelectorAll('button[type="button"]');
      const labels = ['ગુજરાતી', 'हिंदी', 'English'];
      const codes = ['gu', 'hi', 'en'];

      btns.forEach(btn => {
        const txt = btn.textContent.trim();
        const idx = labels.indexOf(txt);
        if (idx !== -1) {
          const langCode = codes[idx];
          btn.setAttribute('data-lang-btn', langCode);
          btn.onclick = (e) => {
            e.preventDefault();
            setLang(langCode);
          };
        }
    const labels = new Map([
      ['ગુજરાતી', 'gu'],
      ['हिंदी', 'hi'],
      ['हिन्दी', 'hi'],
      ['Hindi', 'hi'],
      ['English', 'en']
    ]);
    document.querySelectorAll('button').forEach(btn => {
      // Keep language names in their own scripts and support both the header
      // switcher and page-specific language controls.
      const langCode = btn.getAttribute('data-dlang') || labels.get(btn.textContent.trim());
      if (!VALID_LANGS.includes(langCode)) return;
      btn.setAttribute('data-lang-btn', langCode);
      if (btn._sgLangHandler) return;
      btn._sgLangHandler = true;
      btn.addEventListener('click', e => {
        e.preventDefault();
        setLang(langCode);
      });
    });
  }

  /* ─────────────────── OBSERVE DYNAMIC DOM CHANGES ─────────────────── */
  let debounceTimer = null;
  function observeMutations() {
    if (!window.MutationObserver || !document.body) return;

    const observer = new MutationObserver(() => {
      if (isTranslating) return;
      const current = getLang();
      if (current === 'gu') return; // Default baseline already in DOM

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        wireButtons();
        translateDom(current);
      }, 80);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'alt', 'aria-label']
    });
  }

  /* ─────────────────── APPLY LANG DISPATCHER ─────────────────── */
  function applyLang(lang) {
    wireButtons();
    translateDom(lang);
  }

  /* ─────────────────── INITIALIZE ─────────────────── */
  function init() {
    wireButtons();
    const active = getLang();
    translateDom(active);
    observeMutations();

    // Browser dialogs bypass the DOM translation observer; translate their
    // copy at the point it is shown as part of the selected site language.
    if (!window._sgAlertWrapped) {
      const nativeAlert = window.alert.bind(window);
      window.alert = message => nativeAlert(translateString(String(message), getLang()));
      window._sgAlertWrapped = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export globally
  window.SG = window.SG || {};
  window.SG.lang = getLang;
  window.SG.setLang = setLang;
  window.SG.translate = translateString;
  window.SG.translateDom = translateDom;
})();
