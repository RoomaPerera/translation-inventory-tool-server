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

const mockQualityScore = (input, output, expectedTargetLanguage, detectedTargetLanguage) => {
  if (!input || !output) {
    console.log("⚠️ Input or output missing. Returning default poor score.");
    return {
      score: "Poor",
      marks: 0,
      checkPassed: false,
      languageMatch: false,
      translationMatch: false,
      matchRatio: 0
    };
  }

  const expectedLangCode = normalizeLang(expectedTargetLanguage);
  const detectedLangCode = normalizeLang(detectedTargetLanguage);

  const inputWords = input.trim().toLowerCase().split(/\s+/);
  const outputText = output.trim().toLowerCase();

  const translationKey = inputWords.join('_');
  const language = translationMap[translationKey] || {};

  const expectedTranslation = language[expectedLangCode]?.toLowerCase() || "";

  // 🖨️ Log details for debugging
  console.log(`\n=== 🧪 Translation Quality Check ===`);
  console.log(`🔑 Translation Key: ${translationKey}`);
  console.log(`🔤 Output Text: ${outputText}`);
  console.log(`🌐 Expected Language Code: ${expectedLangCode}`);
  console.log(`🌍 Detected Language Code: ${detectedLangCode}`);
  console.log(`📘 Language Entry from Map:`, language);
  console.log(`📌 Expected Phrase Translation: ${expectedTranslation}`);

  if (expectedTranslation === outputText) {
    console.log(`✅ Exact match found for expected translation.`);
    console.log(`🏁 Final Score: Excellent | Marks: 10`);
    return {
      score: "Excellent",
      marks: 10,
      checkPassed: true,
      languageMatch: expectedLangCode === detectedLangCode,
      translationMatch: true,
      matchRatio: 1.0
    };
  }

  if (expectedLangCode !== detectedLangCode){
    const wordForTheDetectedLanguageCode = language[detectedLangCode]?.toLowerCase() || "";
    if(outputText === wordForTheDetectedLanguageCode){
    return {
            score: "Excellent",
            marks: 10,
            checkPassed:true,
            languageMatch: expectedLangCode === detectedLangCode,
            matchRatio: 1.0,
            };
        }

  }

   if (expectedLangCode === detectedLangCode){
    
    return {
            score: "Excellent",
            marks: 10,
            checkPassed:false,
            languageMatch:false,
            matchRatio: 1.0,
            };
        }

  


  if (expectedTranslation && outputText.includes(expectedTranslation)) {
    console.log(`🟡 Partial match found for expected translation.`);
    console.log(`🏁 Final Score: Good | Marks: 8`);
    return {
      score: "Good",
      marks: 8,
      checkPassed: true,
      languageMatch: expectedLangCode === detectedLangCode,
      translationMatch: false,
      matchRatio: 0.5
    };
  }

  // Word-level match check
  let matchCount = 0;
  for (let word of inputWords) {
    const translatedWord = translationMap[word]?.[expectedLangCode];
    if (translatedWord && outputText.includes(translatedWord.toLowerCase())) {
      matchCount++;
    }
  }

  const matchRatio = matchCount / inputWords.length;
  const translationMatch = expectedTranslation === outputText;

  let marks = 0;
  let score = "Poor";

  if (matchRatio > 0.7) {
    score = "Fair";
    marks = parseFloat((matchRatio * 7).toFixed(2));
  } else if (matchRatio > 0.3) {
    score = "Poor";
    marks = parseFloat((matchRatio * 4).toFixed(2));
  } else {
    score = "Poor";
    marks = parseFloat((matchRatio * 2).toFixed(2));
  }

  console.log(`🔍 Word Match Count: ${matchCount}`);
  console.log(`📈 Match Ratio: ${matchRatio.toFixed(2)}`);
  console.log(`🏁 Final Score: ${score} | Marks: ${marks}`);

  return {
    score,
    marks,
    checkPassed: marks >= 5,
    languageMatch: expectedLangCode === detectedLangCode,
    translationMatch,
    matchRatio: parseFloat(matchRatio.toFixed(2))
  };
};

module.exports = mockQualityScore;
