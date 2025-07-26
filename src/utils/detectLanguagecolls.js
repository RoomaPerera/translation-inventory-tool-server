// utils/detectLanguagecolls.js

const languageIndicators = require('./languageIndicators.json');

const detectLanguagecolls = (text) => {
    if (!text) return "unknown";
    const lowerText = text.trim().toLowerCase();

    for (const [language, indicators] of Object.entries(languageIndicators)) {
        if (indicators.some(word => lowerText.includes(word.toLowerCase()))) {
            return language;
        }
    }

    // If contains only English letters, fallback to English
    if (/^[a-zA-Z\s]+$/.test(lowerText)) {
        return "English";
    }

    return "unknown";
};

module.exports = detectLanguagecolls;
