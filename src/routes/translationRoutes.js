//routes/translationRoutes.js

const express = require('express');
const router = express.Router();

const {
    addTranslation,
    addBulkTranslations,
    updateTranslation,
    getTranslations,
    approveTranslation,
    qualityCheck,
    deleteTranslation,
    translationController
} = require('../controllers/translationController');
const requireRole = require('../middleware/requireRole');
// Import revision controller functions
const {
    getRevisions,
    getDiff,
    revertRevision,
    getCompleteHistory
} = require('../controllers/revisionController');

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

// === Revision Routes ===
// GET /api/translations/:id/revisions
router.get('/:id/revisions', getRevisions);

// GET /api/translations/:id/diff/:revIndex  
router.get('/:id/diff/:revIndex', getDiff);

// POST /api/translations/:id/revert/:revIndex
router.post('/:id/revert/:revIndex', revertRevision);
router.post('/quality-check', qualityCheck);
// GET /api/translations/:id/history - Complete history including current version
router.get('/:id/history', getCompleteHistory);

module.exports = router;