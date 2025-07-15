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
