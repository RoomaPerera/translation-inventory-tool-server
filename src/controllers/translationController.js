const Translation = require('../models/Translation');
const { notifyNewTranslation } = require('../utils/notificationService');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// Add a Translation
exports.addTranslation = async (req, res, next) => {
    try {
        const { translationKey, language, translatedText, product, projectId, context } = req.body;
        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required.' });
        }
        
        // Convert language to uppercase for consistency with translator language storage
        const normalizedLanguage = language.trim().toUpperCase();
        
        const newTranslation = new Translation({
            translationKey,
            language: normalizedLanguage,
            translatedText,
            product,
            projectId,
            context,
            createdBy: req.user.id // Correctly assign the logged-in user's ID
        });
        await newTranslation.save();

        // Send notification to relevant translators
        await notifyNewTranslation({ language: normalizedLanguage, text: translatedText });
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
                        description: `Added a new translation for key: ${translationKey} in language: ${normalizedLanguage}`
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

exports.updateTranslation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { translatedText, status } = req.body;
        const userId = req.user.id;

        const translation = await Translation.findById(id);

        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }

        let updated = false;

        // Handle status update
        if (status && status !== translation.status) {
            translation.status = status;
            updated = true;
        }

        // Handle text update and create revision
        if (translatedText && translatedText !== translation.translatedText) {
            // This method handles saving the revision and updating the main text
            await translation.addRevision(translatedText, userId);
            // The addRevision method already saves, so we don't need to call save again unless only the status changed.
        } else if (updated) {
            // If only the status changed, we need to save manually
            translation.updatedAt = Date.now();
            await translation.save();
        }

        // --- Activity Log: User updates translation ---
        try {
            const user = await User.findById(userId).select('userName');
            if (user) {
                await ActivityLog.create({
                    userId,
                    userName: user.userName,
                    role: req.user.role.toLowerCase(),
                    description: `Updated translation for key: '${translation.translationKey}' in language: ${translation.language}`
                });
            }
        } catch (logErr) {
            console.error('ActivityLog error (updateTranslation):', logErr);
        }

        // Refetch to ensure the response object is fully up-to-date after addRevision
        const updatedTranslation = await Translation.findById(id);

        res.json(updatedTranslation);
    } catch (error) {
        next(error);
    }
};

// Fetch Translations with Filtering and Pagination
exports.getTranslations = async (req, res, next) => {
    try {
        // Pagination parameters from query, with defaults
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // Filtering parameters
        const { product, language, word, key, status, projectId, myWork } = req.query;
        const filter = {};
        if (projectId) filter.projectId = projectId;
        if (product) filter.product = product;
        if (language) filter.language = language;
        if (word) filter.translatedText = { $regex: word, $options: 'i' };
        if (key) filter.translationKey = { $regex: key, $options: 'i' };
        if (status) filter.status = status; // REQ-10: Filter by pending
        if (myWork === 'true') filter.createdBy = req.user.id; // REQ-11: Filter by user's work

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
