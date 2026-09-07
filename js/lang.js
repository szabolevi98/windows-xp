'use strict';
// Nyelvkezelés.
//
// A képernyőn megjelenő szövegek forrása maga a magyar mondat: a kódban
// t('Megnyitás') áll, a lang/<nyelv>.js fájlok pedig magyar → idegen nyelvű
// szótárak. Így egy hiányzó fordításnál a magyar mondat látszik, nem egy
// kulcs, és a kódot olvasva is látni, mi kerül a képernyőre.
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
  const KEY = 'windows-xp-simulator-lang';
  const dictionaries = window.XP_STRINGS || {};
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

  function t(text, params) {
    const table = dictionaries[current] || {};
    let out = table[text] ?? text;
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
  // fordítandó helyeket, hogy az index.html olvasható maradjon.
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

  return {t, setLanguage, applyToDom, languages: SUPPORTED,
    onChange: fn => listeners.push(fn),
    get language() { return current; }};
})();
