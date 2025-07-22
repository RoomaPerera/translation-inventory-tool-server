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

const { getLanguages } = require('../controllers/authController');

// This route will handle GET /api/languages, which the frontend expects.
router.get('/', getLanguages);

module.exports = router;