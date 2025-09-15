//controller/translationController.js

const { detectLanguageSimple } = require('../config/languageDetector');
const TranslationCheckResult = require('../models/TranslationCheckResult');

const mockQualityScore = (input, output) => {
  if (!output) return { score: "Poor", marks: 2 };
  
  if (output.length > 20) return { score: "Excellent", marks: 9 };
  return { score: "Good", marks: 7 };
};

exports.qualityCheck = async (req, res, next) => {
  try {
    const { inputText, translatedText, expectedTargetLanguage } = req.body;

    if (!inputText || !translatedText || !expectedTargetLanguage) {
      return res.status(400).json({ error: "inputText, translatedText and expectedTargetLanguage are required" });
    }

    const detectedSourceLanguage = detectLanguageSimple(inputText);
    const detectedTargetLanguage = detectLanguageSimple(translatedText);
    const languageMatch = detectedTargetLanguage === expectedTargetLanguage;
    const { score, marks } = mockQualityScore(inputText, translatedText);

    const result = new TranslationCheckResult({
      inputText,
      translatedText,
      detectedSourceLanguage,
      detectedTargetLanguage,
      languageMatch,
      score,
      marks,
    });

    await result.save();

    res.json({
      
      detectedTargetLanguage,
      languageMatch,
      score,
      marks,
    });
  } catch (error) {
    next(error);
  }
};

