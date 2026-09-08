'use strict';
// Nyelvkezelés.
//
// A program stabil text_* kulcsokat használ. Minden látható szöveg, a magyar
// is, a lang/<nyelv>.js szótárakban él.
//
// A fájl a többi szkript ELŐTT fut, mert a rendszer a betöltéskor is szöveget
// ír (fájlnevek, a fiók neve), és addigra kész kell lennie a szótárnak.
window.XP_I18N = (() => {
  const SUPPORTED = Object.freeze([
    {code: 'hu', label: 'Magyar'},
    {code: 'en', label: 'English'},
    {code: 'de', label: 'Deutsch'}
  ]);
  const FALLBACK = 'en';
  // A dátumok, órák és számok is a nyelvhez igazodnak: az XP-ben ezt
  // ugyanaz a Területi és nyelvi beállítások ablak döntötte el.
  const LOCALES = {hu: 'hu-HU', en: 'en-US', de: 'de-DE'};
  const KEY = 'windows-xp-simulator-lang';
  const dictionaries = window.XP_STRINGS || {};
  const hungarianKeys = new Map(Object.entries(dictionaries.hu || {}).map(([key, value]) => [value, key]));
  const listeners = [];

  // Először a böngésző nyelve dönt, utána a felhasználó választása, mert azt
  // eltároljuk: egy magyar böngészőben németre váltva a beállítás megmarad.
  function pick() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && SUPPORTED.some(l => l.code === saved)) return saved;
    } catch { /* privát mód */ }
    for (const tag of [navigator.language, ...(navigator.languages || [])]) {
      const code = String(tag || '').toLowerCase().split('-')[0];
      if (SUPPORTED.some(l => l.code === code)) return code;
    }
    return FALLBACK;
  }

  let current = pick();
  document.documentElement.lang = current;

  function t(key, params) {
    const table = dictionaries[current] || {};
    // Régi mentések és néhány adatlista még tartalmazhat magyar címkéket.
    // Ezeket is feloldjuk, miközben az alkalmazáskód már stabil kulcsokat kér.
    const resolved = key in table ? key : hungarianKeys.get(key) || key;
    let out = table[resolved] ?? dictionaries[FALLBACK]?.[resolved] ?? dictionaries.hu?.[resolved] ?? key;
    if (params) out = out.replace(/\{(\w+)\}/g, (all, name) => (
      params[name] === undefined ? all : String(params[name])
    ));
    return out;
  }

  function setLanguage(code) {
    if (!SUPPORTED.some(l => l.code === code) || code === current) return false;
    current = code;
    document.documentElement.lang = code;
    try { localStorage.setItem(KEY, code); } catch { /* privát mód */ }
    applyToDom();
    listeners.forEach(fn => { try { fn(code); } catch (error) { console.error(error); } });
    document.dispatchEvent(new CustomEvent('xp-language-changed'));
    document.dispatchEvent(new CustomEvent('xp-settings-changed'));
    return true;
  }

  // A markupban `data-i18n` (szöveg) és `data-i18n-<attribútum>` jelöli a
  // fordítandó helyeket; az értékük ugyanaz a stabil kulcs, mint a t() hívásoké.
  function applyToDom(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('*').forEach(el => {
      for (const name of Object.keys(el.dataset)) {
        if (!name.startsWith('i18n') || name === 'i18n') continue;
        const attr = name.slice(4).replace(/[A-Z]/g, c => `-${c.toLowerCase()}`).replace(/^-/, '');
        el.setAttribute(attr, t(el.dataset[name]));
      }
    });
  }

  // Az index.html feliratai is a választott nyelven jelennek meg: a fájl a
  // `defer` miatt a kész dokumentumon fut, így itt már van mit lefordítani.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => applyToDom());
  else applyToDom();

  return {t, setLanguage, applyToDom, languages: SUPPORTED,
    get locale() { return LOCALES[current] || LOCALES[FALLBACK]; },
    onChange: fn => listeners.push(fn),
    get language() { return current; }};
})();
