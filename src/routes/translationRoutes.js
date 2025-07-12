const express = require('express');
const Translation = require('../models/Translation');
const {
    addTranslation,
    updateTranslation,
    getTranslations,
    approveTranslation  // ✅ ADDED
} = require('../controllers/translationController');

const checkAdmin = require('../middleware/checkRole'); // ✅ NEW: admin role check middleware

const router = express.Router();

// Add a translation
router.post('/', async (req, res) => {
  try {
    const { translationKey, language, translatedText, product, createdBy, projectId } = req.body;
    const newTranslation = new Translation({ translationKey, language, translatedText, product, createdBy, projectId });
    await newTranslation.save();
    res.status(201).json(newTranslation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a translation
router.put('/:id', async (req, res) => {
  try {
    const { translatedText, status } = req.body;
    const updatedTranslation = await Translation.findByIdAndUpdate(
      req.params.id,
      { translatedText, status, updatedAt: Date.now() },
      { new: true }
    );
    res.json(updatedTranslation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get translations with filtering
router.get('/', async (req, res) => {
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
    res.status(400).json({ message: error.message });
  }
});

// ✅ These lines are fine as they allow controller-based handling
router.post('/', addTranslation);
router.put('/:id', updateTranslation);
router.get('/', getTranslations);

// ✅ Approve translation (admin-only)
router.put('/approve/:id', checkAdmin, approveTranslation);  // ✅ PROTECTED

module.exports = router;