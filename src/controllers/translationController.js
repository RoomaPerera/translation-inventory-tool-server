// controllers/translationController.js

const Translation = require('../models/Translation');
const ActivityLog = require('../models/ActivityLog');
const { notifyNewTranslation } = require('../utils/notificationService');
const UserActivity = require('../models/UserActivity');
const { User } = require('../models/User');
const TranslationCheckResult = require('../models/TranslationCheckResult');
const mockQualityScore = require('../utils/mockQualityScore'); // ✅ added
const  detectLanguageSimple = require('../utils/detectLanguagecolls'); // ✅ added
// ----------------- CRUD CONTROLLERS ---------------------

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

        // Send notification to relevant translators only if there's actual text
        if (translatedText && translatedText.trim() !== '') {
            try {
                await notifyNewTranslation({ language: normalizedLanguage, text: translatedText });
                console.log(`Translation notification sent for language: ${normalizedLanguage}`);
            } catch (notificationError) {
                console.error(`Failed to send translation notification: ${notificationError.message}`);
                // Continue even if notification fails
            }
        }
        
        // --- UserActivity Log: For anomaly detection ---
        try {
            await UserActivity.create({
                user: req.user.id,
                type: 'translation_created',
                success: true,
                ip: req.ip,
                details: { 
                    translationKey, 
                    language: normalizedLanguage, 
                    projectId 
                }
            });
        } catch (activityErr) {
            console.error('UserActivity error (addTranslation):', activityErr);
        }
        
        // --- Activity Log: User adds translation ---
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const userName = req.user?.userName;
            
            if (userId && userRole) {
                if (userName) {
                    // If userName is already available in req.user
                    await ActivityLog.create({
                        userId,
                        userName,
                        role: userRole.toLowerCase(),
                        description: `Added a new translation for key: ${translationKey} in language: ${normalizedLanguage}`
                    });
                } else {
                    // Fallback to getting user details if userName is not in req.user
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
            }
        } catch (logErr) {
            console.error('ActivityLog error (addTranslation):', logErr);
        }


        res.status(201).json(newTranslation);
    } catch (error) {
        console.error(error);
        next(error);
    }
};

// Add multiple translations at once (bulk creation)
exports.addBulkTranslations = async (req, res, next) => {
    try {
        const { translations } = req.body;
        
        if (!translations || !Array.isArray(translations) || translations.length === 0) {
            return res.status(400).json({ error: 'Translations array is required and cannot be empty.' });
        }

        // Validate that all translations have required fields
        for (let i = 0; i < translations.length; i++) {
            const { translationKey, language, projectId } = translations[i];
            if (!translationKey || !language || !projectId) {
                return res.status(400).json({ 
                    error: `Translation at index ${i} is missing required fields (translationKey, language, projectId).` 
                });
            }
        }

        // Create all translations efficiently using insertMany
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        // Prepare all translation documents
        const translationDocs = translations.map(translationData => ({
            ...translationData,
            createdBy: userId
        }));
        
        // Bulk insert all translations at once
        const createdTranslations = await Translation.insertMany(translationDocs);

        // Send notifications in batch (non-blocking)
        const notificationPromises = translations
            .map(translationData => 
                notifyNewTranslation({ 
                    language: translationData.language, 
                    text: translationData.translatedText 
                }).catch(err => console.error('Notification error:', err))
            );
        
        // Don't wait for notifications to complete
        Promise.allSettled(notificationPromises);

        // Activity Log: Bulk translation creation (async, non-blocking)
        if (userId && userRole) {
            User.findById(userId).select('userName').then(user => {
                if (user) {
                    ActivityLog.create({
                        userId,
                        userName: user.userName,
                        role: userRole.toLowerCase(),
                        description: `Added ${createdTranslations.length} translations in bulk for key: ${translations[0].translationKey}`
                    }).catch(logErr => console.error('ActivityLog error (addBulkTranslations):', logErr));
                }
            }).catch(err => console.error('User lookup error:', err));
        }

        res.status(201).json({
            message: `Successfully created ${createdTranslations.length} translations`,
            translations: createdTranslations
        });
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

        // --- UserActivity Log: For anomaly detection ---
        try {
            await UserActivity.create({
                user: userId,
                type: 'translation_updated',
                success: true,
                ip: req.ip,
                details: { 
                    translationId: id,
                    translationKey: translation.translationKey,
                    language: translation.language,
                    hasTextChange: !!translatedText,
                    hasStatusChange: !!status
                }
            });
        } catch (activityErr) {
            console.error('UserActivity error (updateTranslation):', activityErr);
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

exports.editTranslationText = async (req, res, next) => {
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
                .populate('createdBy', 'userName') // Only populate required fields
                .select('-revisions') // Exclude heavy revision data for list view
                .sort({ createdAt: -1 }) // Sort by most recent (uses index)
                .skip(skip)
                .limit(limit)
                .lean(), // Use lean() for better performance (returns plain objects)
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