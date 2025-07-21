const Translation = require('../models/Translation');
const { notifyNewTranslation } = require('../utils/notificationService');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// Add a Translation
exports.addTranslation = async (req, res, next) => {

    try {
        const { translationKey, language, translatedText, product, createdBy } = req.body;
        const newTranslation = new Translation({ translationKey, language, translatedText, product, createdBy });
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

// Update a Translation (edit text or status)
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
    const { product, language, word, key, status} = req.query;
    const filter = {};
    if (product) filter.product = product;
    if (language) filter.language = language;
    if (word) filter.translatedText = { $regex: word, $options: 'i' };
    if (key) filter.translationKey = key;
    if (status) filter.status = status;
    
    const translations = await Translation.find(filter);
    res.json(translations);
  } catch (error) {
    next(error);
  }
};

// ✅ Approve a Translation 
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
    next(error);
  }
};