const express = require('express');
const router = express.Router();
const revisionRoutes = require('./revisionRoutes'); // Import the sub-router

// Import all necessary translation controller functions
const {
    addTranslation,
    updateTranslation,
    getTranslations,
    deleteTranslation,
} = require('../controllers/translationController');


// === Main Translation CRUD Routes ===

// GET all translations with optional filtering
// Handles GET /api/translations
router.get('/', getTranslations);

// POST a new translation
// Handles POST /api/translations
router.post('/', addTranslation);

// PUT an update to a translation's text or status. This also handles revisions.
// Handles PUT /api/translations/:id
router.put('/:id', updateTranslation);

// DELETE a translation by ID
// Handles DELETE /api/translations/:id
router.delete('/:id', deleteTranslation);


// === Sub-Router for Revisions ===
// Any request starting with /api/translations/revisions will be passed to revisionRoutes.js
router.use('/revisions', revisionRoutes);




module.exports = router;