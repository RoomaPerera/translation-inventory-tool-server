const express = require('express');
const revisionRoutes = require('./revisionRoutes'); // Import the sub-router

// Import all necessary translation controller functions
const {
    addTranslation,
    updateTranslation,
    getTranslations,
    editTranslationText,
    deleteTranslation,
    approveTranslation
} = require('../controllers/translationController');

const checkAdmin = require('../middleware/checkRole');

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

// ✅ These lines are fine as they allow controller-based handlin

// GET all translations with optional filtering
// Handles GET /api/translations
router.get('/', getTranslations);

router.post('/', addTranslation);

// PUT an update to a translation's text or status
// Handles PUT /api/translations/:id
router.put('/:id', updateTranslation);


// ✅ Approve translation (admin-only)
router.put('/approve/:id', checkAdmin, approveTranslation);  // ✅ PROTECTED

// PATCH for specifically editing text, which creates a revision
// Handles PATCH /api/translations/edit
router.patch('/edit', editTranslationText);


// === Sub-Router for Revisions ===
// Any request starting with /api/translations/revisions will be passed to revisionRoutes.js
router.use('/revisions', revisionRoutes);

router.delete('/:id', deleteTranslation);

module.exports = router;