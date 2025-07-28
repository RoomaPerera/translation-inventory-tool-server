// translationRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();

const {
    addTranslation,
    updateTranslation,
    getTranslations,
    deleteTranslation,
} = require('../controllers/translationController');

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

// GET /api/translations/:id/history - Complete history including current version
router.get('/:id/history', getCompleteHistory);

module.exports = router;