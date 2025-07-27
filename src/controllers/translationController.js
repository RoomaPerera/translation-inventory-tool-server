// controllers/translationController.js

const Translation = require('../models/Translation');
const { notifyNewTranslation } = require('../utils/notificationService');
const User = require('../models/User');
const TranslationCheckResult = require('../models/TranslationCheckResult');
const mockQualityScore = require('../utils/mockQualityScore'); // ✅ added
const  detectLanguageSimple = require('../utils/detectLanguagecolls'); // ✅ added
// ----------------- CRUD CONTROLLERS ---------------------

exports.addTranslation = async (req, res, next) => {
    try {
        const { translationKey, language, translatedText, product } = req.body;
        const newTranslation = new Translation({
            translationKey,
            language,
            translatedText,
            product,
            createdBy: req.user.id
        });
        await newTranslation.save();
        await notifyNewTranslation({ language, text: translatedText });
        res.status(201).json(newTranslation);
    } catch (error) {
        console.error(error);
        next(error);
    }
};

exports.updateTranslation = async (req, res, next) => {
    try {
        const { translatedText, status, context } = req.body;
        const updatedTranslation = await Translation.findByIdAndUpdate(
            req.params.id,
            {
                ...(translatedText && { translatedText }),
                ...(status && { status }),
                ...(context && { context }),
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!updatedTranslation) {
            return res.status(404).json({ message: "Translation not found" });
        }

        res.json(updatedTranslation);
    } catch (error) {
        console.error(error);
        next(error);
    }
};

exports.editTranslationText = async (req, res, next) => {
    try {
        const { id, translatedText } = req.body;
        const translation = await Translation.findById(id);

        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }

        await translation.addRevision(translatedText, req.user.id);

        res.json({ message: 'Translation updated and revision saved', translation });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

exports.approveTranslation = async (req, res, next) => {
    try {
        const translation = await Translation.findById(req.params.id);

        if (!translation) {
            return res.status(404).json({ message: "Translation not found" });
        }

        translation.status = 'approved';
        translation.updatedAt = Date.now();
        await translation.save();

        res.status(200).json({ message: "Translation approved", translation });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

exports.getTranslations = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
        const skip = (page - 1) * limit;

        const { product, language, word, key, status } = req.query;
        const filter = {};

        if (product) filter.product = product;
        if (language) filter.language = language;
        if (word) filter.translatedText = { $regex: word, $options: 'i' };
        if (key) filter.translationKey = key;
        if (status) filter.status = status;

        const [translations, totalItems] = await Promise.all([
            Translation.find(filter)
                .populate('createdBy', 'userName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Translation.countDocuments(filter)
        ]);

        res.json({
            translations,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            totalItems
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

exports.deleteTranslation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const translation = await Translation.findByIdAndDelete(id);

        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }

        res.status(200).json({ message: 'Translation deleted successfully', id });
    } catch (error) {
        console.error(error);
        next(error);
    }
};


exports.qualityCheck = async (req, res, next) => {
    try {
        const { inputText, translatedText, expectedTargetLanguage } = req.body;

        if (!inputText || !translatedText || !expectedTargetLanguage) {
            return res.status(400).json({ error: "inputText, translatedText and expectedTargetLanguage are required" });
        }

        const detectedSourceLanguage = detectLanguageSimple(inputText);
        const detectedTargetLanguage = detectLanguageSimple(translatedText);

        const { score, marks, checkPassed } = mockQualityScore(
            inputText,
            translatedText,
            expectedTargetLanguage,
            detectedTargetLanguage
        );

        let languageMatch = detectedTargetLanguage === expectedTargetLanguage;
        if (marks > 5) {
            languageMatch = true;
        }

        const result = new TranslationCheckResult({
            inputText,
            translatedText,
            detectedSourceLanguage,
            detectedTargetLanguage,
            languageMatch,
            score,
            marks,
            checkPassed
        });

        await result.save();

        res.json({
            detectedTargetLanguage,
            languageMatch,
            score,
            marks,
            checkPassed
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};
