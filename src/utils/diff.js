const { diffWords, diffChars } = require('diff');

/**
 * Returns an array of { value, added?, removed? } objects
 */
function computeDiff(oldText, newText) {
    const isSingledWord = !/\s/.test(oldText + newText);
    return isSingledWord ? diffChars(oldText, newText) : diffWords(oldText, newText);
}

module.exports = { computeDiff };