// languageDetector.js
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();

// Mapping of detected language names to ISO 639-1 codes
const iso6393to1 = {
  deu: 'de',
  eng: 'en',
  fra: 'fr',
  spa: 'es',
  ita: 'it',
  // add more if needed
};

exports.detectLanguage = (text) => {
  const result = lngDetector.detect(text, 1);
  return result.length > 0 ? result[0][0] : 'unknown';
};

exports.detectLanguageSimple = (text) => {
  const langCode = exports.detectLanguage(text);
  return iso6393to1[langCode] || langCode;
};

exports.detectLanguageWithConfidence = (text) => {
  const result = lngDetector.detect(text, 1);
  if (result.length > 0) {
    const langCode = result[0][0];
    const confidence = result[0][1];
    return { langCode: iso6393to1[langCode] || langCode, confidence };
  }
  return { langCode: 'unknown', confidence: 0 };
};
