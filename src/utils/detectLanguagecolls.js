// utils/detectLanguage.js
const path = require('path');
const translationMap = require(path.join(__dirname, '../../uploads/translationMap.json'));

const langNameToCode = {
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Sinhala: 'si',
  Tamil: 'ta',
  Chinese: 'zh',
  Japanese: 'ja',
  Arabic: 'ar',
  Hindi: 'hi'
};

const normalizeLang = (lang) => {
  if (!lang || typeof lang !== 'string') return '';
  const lowered = lang.toLowerCase();

  if (Object.values(langNameToCode).includes(lowered)) {
    return lowered;
  }

  for (const [name, code] of Object.entries(langNameToCode)) {
    if (name.toLowerCase() === lowered) {
      return code;
    }
  }

  return lowered;
};

const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'unknown';

  const input = text.trim().toLowerCase();

  for (const key in translationMap) {
    const translations = translationMap[key];
    if (!translations || typeof translations !== 'object') continue;

    for (const [langCode, translatedWord] of Object.entries(translations)) {
      if (typeof translatedWord !== 'string') continue;
      if (translatedWord.trim().toLowerCase() === input) {
        return normalizeLang(langCode);
      }
    }
  }

  if (/^[a-zA-Z\s]+$/.test(input)) return 'en';

  return 'unknown';
};

module.exports = detectLanguage;
