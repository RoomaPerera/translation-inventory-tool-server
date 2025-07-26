const path = require('path');
const translationMap = require(path.join(__dirname, '../../uploads/translationMap.json'));
const stringSimilarity = require('string-similarity');

// Inline language code map
const langMap = {
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    si: 'Sinhala',
    ta: 'Tamil',
    zh: 'Chinese',
    ja: 'Japanese',
    ar: 'Arabic',
    hi: 'Hindi'
};

// Convert "French" to "fr"
const normalizeLang = (langName) => {
    const found = Object.entries(langMap).find(([code, name]) => name.toLowerCase() === langName.toLowerCase());
    return found ? found[0] : langName.toLowerCase(); // fallback to lowercase input
};

// const mockQualityScore = (input, output, expectedTargetLanguage, detectedTargetLanguage) => {
//     if (!input || !output) {
//         return {
//             score: "Poor",
//             marks: 0,
//             checkPassed: false,
//             languageMatch: false,
//             matchRatio: 0
//         };
//     }

//     const expectedLangCode = expectedTargetLanguage.toLowerCase();
//     const detectedLangCode = normalizeLang(detectedTargetLanguage);

//     const inputWords = input.trim().toLowerCase().split(/\s+/);
//     const outputText = output.trim().toLowerCase();

//     let matchCount = 0;

//     for (let word of inputWords) {
//         const translatedWord = translationMap[word]?.[expectedLangCode];
//         if (translatedWord && outputText.includes(translatedWord.toLowerCase())) {
//             matchCount++;
//         }
//     }

//     const matchRatio = matchCount / inputWords.length;
//     let marks = parseFloat((matchRatio * 10).toFixed(2));

//     let score = "Poor";
//     if (marks >= 7) score = "Excellent";
//     else if (marks >= 5) score = "Good";
//     else if (marks >= 3) score = "Fair";

//     return {
//         score,
//         marks,
//         checkPassed: marks >= 5,
//         languageMatch: expectedLangCode === detectedLangCode,
//         matchRatio
//     };
// };

const mockQualityScore = (input, output, expectedTargetLanguage, detectedTargetLanguage) => {
    if (!input || !output) {
        return {
            score: "Poor",
            marks: 0,
            checkPassed: false,
            languageMatch: false,
            matchRatio: 0
        };
    }

    const expectedLangCode = expectedTargetLanguage.toLowerCase();
    const detectedLangCode = normalizeLang(detectedTargetLanguage);

    const inputWords = input.trim().toLowerCase().split(/\s+/);
    const outputText = output.trim().toLowerCase();

    let matchCount = 0;

    for (let word of inputWords) {
        const translatedWord = translationMap[word]?.[expectedLangCode];
        if (translatedWord && outputText.includes(translatedWord.toLowerCase())) {
            matchCount++;
        }
    }

    const matchRatio = matchCount / inputWords.length;
    
    // Initial marks calculation (for example):
    let marks = matchRatio * 10;

    let score = "Poor";

    // Assign score first based on marks
    if (marks >= 8) {
        const lengthDiff=Math.abs(inputWords.length - outputText.length);
        if(inputWords.length <=output.length && lengthDiff <= 6) {
            marks = matchRatio * 2 + 8;
            score = "Excellent";

        }
        
         // Recalculate marks for Excellent
    } else if (marks >= 5) {
        score = "Good";
        marks = matchRatio * 3 + 5;  // Recalculate marks for Good
    } else if (marks >= 3) {
        score = "Fair";
        marks = matchRatio * 2 + 3;  // Recalculate marks for Fair
    } else {
        marks = matchRatio * 3;      // Recalculate marks for Poor
    }

    // Fix marks to two decimals and clamp to max 10
    marks = Math.min(10, parseFloat(marks.toFixed(2)));

    return {
        score,
        marks,
        checkPassed: marks >= 5,
        languageMatch: expectedLangCode === detectedLangCode,
        matchRatio
    };
};


module.exports = mockQualityScore;
