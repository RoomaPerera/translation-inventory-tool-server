const express = require('express');
const router = express.Router();
const revisionRoutes = require('./revisionRoutes'); // Import the sub-router

// Import all necessary translation controller functions
const {
    addTranslation,
    updateTranslation,
    getTranslations,
    editTranslationText,
    deleteTranslation,
} = require('../controllers/translationController');


// === Main Translation CRUD Routes ===

// GET all translations with optional filtering
// Handles GET /api/translations
router.get('/', getTranslations);

// POST a new translation
// Handles POST /api/translations
router.post('/', addTranslation);

// PUT an update to a translation's text or status
// Handles PUT /api/translations/:id
router.put('/:id', updateTranslation);

// PATCH for specifically editing text, which creates a revision
// Handles PATCH /api/translations/edit
router.patch('/edit', editTranslationText);


// === Sub-Router for Revisions ===
// Any request starting with /api/translations/revisions will be passed to revisionRoutes.js
router.use('/revisions', revisionRoutes);

router.delete('/:id', deleteTranslation);


module.exports = router;