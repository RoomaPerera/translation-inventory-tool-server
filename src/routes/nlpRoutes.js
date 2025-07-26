const express = require('express');
const router = express.Router();
const {
  suggestTranslations,
  extractGlossary
} = require('../controllers/nlpController');

router.post('/suggest', suggestTranslations);
router.post('/glossary', extractGlossary);

module.exports = router;
