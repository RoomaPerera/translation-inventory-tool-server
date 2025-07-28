const express = require('express');
const router = express.Router();
const {
    addLanguage,
    getAllLanguages,
    updateLanguage,
    deleteLanguage
} = require('../controllers/languageController');
const requireRole = require('../middleware/requireRole');

const requireAuth = require('../middleware/requireAuth');
// Middleware
router.use(requireAuth);

// GET all languages (accessible to all authenticated users)
router.get('/', getAllLanguages);

// --- Admin-Only Routes ---
router.use(requireRole('Admin'));

// POST a new language
router.post('/', addLanguage);

// PUT to update a language by ID
router.put('/:id', updateLanguage);

// DELETE a language
router.delete('/:id', deleteLanguage);

module.exports = router;