const Language = require('../models/Language');

let _cachedCodes = null;

async function getAllowedLanguageCodes() {
    if (_cachedCodes) return _cachedCodes;
    const langs = await Language.find().select({ code: 1, _id: 0 }).lean();
    _cachedCodes = langs.map(l => l.code);
    return _cachedCodes;
}

module.exports = { getAllowedLanguageCodes };