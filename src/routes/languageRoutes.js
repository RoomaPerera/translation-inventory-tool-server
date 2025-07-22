const express = require('express');
const router = express.Router();

const {
    addLanguage,
    getAllLanguages,
    updateLanguage,
    deleteLanguage
} = require('../controllers/languageController');

//const requireAuth = require('../middleware/requireAuth');
// Middleware
//router.use(requireAuth);

// Get all languages
router.get('/', getAllLanguages);

// Add a new language
router.post('/', addLanguage);

// Update a language by ID
router.put('/:id', updateLanguage);

// Delete a language
router.delete('/:id', deleteLanguage);

module.exports = router;