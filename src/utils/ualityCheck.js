//utils/ualityCheck.js


const franc = require('franc');

const detectLanguage = (text) => {
  const langCode = franc(text, { minLength: 3 });
  // franc returns 'und' if it can't detect
  if (langCode === 'und') return null;
  return langCode; // ISO 639-3 code, e.g., 'deu' for German
};

// Convert ISO 639-3 to ISO 639-1 (2-letter) if needed
// franc uses 3-letter codes, so we map a few important ones here:
const iso6393to1 = {
  deu: 'de',
  eng: 'en',
  fra: 'fr',
  spa: 'es',
  ita: 'it',
  // add more if needed
};

const detectLanguageSimple = (text) => {
  const code3 = detectLanguage(text);
  return code3 ? (iso6393to1[code3] || code3) : null;
};

module.exports = { detectLanguageSimple };
