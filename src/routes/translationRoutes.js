//routes/translationRoutes.js

const express = require('express');
const router = express.Router();
const revisionRoutes = require('./revisionRoutes'); // Import the sub-router

// Import all necessary translation controller functions
const {
    addTranslation,
    addBulkTranslations,
    updateTranslation,
    getTranslations,
    approveTranslation ,
    qualityCheck ,
    deleteTranslation,
    translationController
} = require('../controllers/translationController');
const requireRole = require('../middleware/requireRole');

// === Main Translation CRUD Routes ===

// GET all translations with optional filtering
// Handles GET /api/translations
router.get('/', getTranslations);

// POST a new translation
// Handles POST /api/translations
router.post('/', addTranslation);

// POST multiple translations at once (bulk creation)
// Handles POST /api/translations/bulk
router.post('/bulk', addBulkTranslations);

// PUT an update to a translation's text or status. This also handles revisions.
// Handles PUT /api/translations/:id
router.put('/:id', updateTranslation);

// DELETE a translation by ID
// Handles DELETE /api/translations/:id
router.delete('/:id', deleteTranslation);


// === Sub-Router for Revisions ===
// Any request starting with /api/translations/revisions will be passed to revisionRoutes.js
router.use('/revisions', revisionRoutes);

router.post('/quality-check',qualityCheck);


module.exports = router;