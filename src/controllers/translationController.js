const Translation = require('../models/Translation');

// Add a Translation
exports.addTranslation = async (req, res, next) => {
    try {
        const { translationKey, language, translatedText, product, createdBy } = req.body;
        const newTranslation = new Translation({ translationKey, language, translatedText, product, createdBy });
        await newTranslation.save();
        res.status(201).json(newTranslation);
    } catch (error) {
        next(error);
    }
};

// Update a Translation
exports.updateTranslation = async (req, res, next) => {
    try {
        const { translatedText, status } = req.body;
        const updatedTranslation = await Translation.findByIdAndUpdate(
            req.params.id,
            { translatedText, status, updatedAt: Date.now() },
            { new: true }
        );
        res.json(updatedTranslation);
    } catch (error) {
        next(error);
    }
};

/**
 * Edit the translation text (by key + language), pushing old text into revisions
 */
exports.editTranslationText = async (req, res, next) => {
    try {
        const { _id, translatedText } = req.body;
        const translation = await Translation.findOne({ _id });
        if (!translation) {
            return res.status(404).json({ error: 'Translation not found for that key/language' });
        }
        await translation.addRevision(translatedText, req.user.id);
        res.json(translation);
    } catch (error) {
        next(error);
    }
};

// Fetch Translations with Filtering
exports.getTranslations = async (req, res, next) => {
    try {
        const { product, language, word, key } = req.query;
        const filter = {};
        if (product) filter.product = product;
        if (language) filter.language = language;
        if (word) filter.translatedText = { $regex: word, $options: 'i' };
        if (key) filter.translationKey = key;

        const translations = await Translation.find(filter);
        res.json(translations);
    } catch (error) {
        next(error);
    }
};