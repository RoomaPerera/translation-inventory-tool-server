const express = require('express');
const {
    addTranslation,
    updateTranslation,
    getTranslations,
    editTranslationText
} = require('../controllers/translationController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.post('/addTranslation', addTranslation);
router.get('/getTranslations', getTranslations);
router.put('/updateTranslation/:id', updateTranslation);
router.put('/editTranslationText', editTranslationText);

module.exports = router;