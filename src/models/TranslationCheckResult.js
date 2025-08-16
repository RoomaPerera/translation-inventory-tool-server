//models/TranslationCheckResult.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const translationCheckResultSchema = new Schema({
inputText: String,
outputText:String,
translatedText: String,
detectedSourceLanguage: String,
detectedTargetLanguage: String,
languageMatch: Boolean,
score: String,
marks: Number,
createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TranslationCheckResult', translationCheckResultSchema);
