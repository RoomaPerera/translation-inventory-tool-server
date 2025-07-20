const Translation = require('../models/Translation');
const User = require('../models/User'); // Keep this, it's used by the Revision model method

// Add a Translation
exports.addTranslation = async (req, res, next) => {
    try {
        const { translationKey, language, translatedText, product } = req.body;
        const newTranslation = new Translation({
            translationKey,
            language,
            translatedText,
            product,
            createdBy: req.user.id // Correctly assign the logged-in user's ID
        });
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
        if (!updatedTranslation) {
            return res.status(404).json({ error: 'Translation not found' });
        }
        res.json(updatedTranslation);
    } catch (error) {
        next(error);
    }
};

/**
 * Edit the translation text (by _id), pushing old text into revisions
 */
exports.editTranslationText = async (req, res, next) => {
    try {
        const { id, translatedText } = req.body; // Using 'id' for consistency
        const translation = await Translation.findById(id);
        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }
        // Call the instance method from the model
        await translation.addRevision(translatedText, req.user.id);
        res.json({ message: 'Translation updated and revision saved', translation });
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

        // Improvement: Populate the 'createdBy' field to get the username
        const translations = await Translation.find(filter).populate('createdBy', 'userName');
        res.json(translations);
    } catch (error) {
        next(error);
    }
};

// *** THIS IS THE NEWLY ADDED FUNCTION ***
// Delete a Translation by its ID
exports.deleteTranslation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const translation = await Translation.findByIdAndDelete(id);
        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }
        res.status(200).json({ message: 'Translation deleted successfully', id: id });
    } catch (error) {
        next(error);
    }
};
