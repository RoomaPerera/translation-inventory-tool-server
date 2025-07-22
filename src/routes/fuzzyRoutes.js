const express = require('express');
const router = express.Router();
const { fuzzySearch } = require('../controllers/fuzzyController');

router.get('/fuzzy-search', fuzzySearch);

module.exports = router;
