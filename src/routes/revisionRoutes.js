const router = require('express').Router();

const {
    getRevisions,
    getDiff,
    revertRevision
} = require('../controllers/revisionController');

// NOTE: These paths are now relative to where this router is mounted.
// The parent router will mount this on '/revisions'.

// Handles GET /api/translations/revisions/:id
router.get('/:id', getRevisions);

// Handles GET /api/translations/revisions/diff/:id/:revIndex
router.get('/diff/:id/:revIndex', getDiff);

// Handles POST /api/translations/revisions/revert/:id/:revIndex
router.post('/revert/:id/:revIndex', revertRevision);

module.exports = router;