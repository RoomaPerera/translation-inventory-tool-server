const Translation = require('../models/Translation');

// Add a Translation
exports.addTranslation = async (req, res, next) => {
  try {
    const { translationKey, language, translatedText, product, createdBy, projectId } = req.body;
    const newTranslation = new Translation({ translationKey, language, translatedText, product, context, createdBy, projectId });
    await newTranslation.save();
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

// ✅ Approve a Translation (new function)
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