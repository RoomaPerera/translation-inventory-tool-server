const Translation = require('../models/Translation');
//const { notifyNewTranslation } = require('../utils/notificationService');
//const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');


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

        // Send notification to relevant translators
        await notifyNewTranslation({ language, text: translatedText });
        // --- Activity Log: User adds translation ---
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            if (userId && userRole) {
                const user = await User.findById(userId).select('userName');
                if (user) {
                    await ActivityLog.create({
                        userId,
                        userName: user.userName,
                        role: userRole.toLowerCase(),
                        description: `Added a new translation for key: ${translationKey} in language: ${language}`
                    });
                }
            }
        } catch (logErr) {
            console.error('ActivityLog error (addTranslation):', logErr);
        }

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

// Fetch Translations with Filtering and Pagination
exports.getTranslations = async (req, res, next) => {
    try {
        console.log("--- RUNNING LATEST getTranslations CONTROLLER ---");
        console.log("Received Query Params:", req.query);
        // Pagination parameters from query, with defaults
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // Filtering parameters
        const { product, language, word, key } = req.query;
        const filter = {};
        if (product) filter.product = product;
        if (language) filter.language = language;
        if (word) filter.translatedText = { $regex: word, $options: 'i' };
        if (key) filter.translationKey = { $regex: key, $options: 'i' };

        // Execute two queries in parallel: one for the data, one for the total count
        const [translations, totalItems] = await Promise.all([
            Translation.find(filter)
                .populate('createdBy', 'userName')
                .sort({ createdAt: -1 }) // Sort by most recent
                .skip(skip)
                .limit(limit),
            Translation.countDocuments(filter)
        ]);

        // Send a structured response with pagination metadata
        res.json({
            translations,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            totalItems
        });
    } catch (error) {
        next(error);
    }
};


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
