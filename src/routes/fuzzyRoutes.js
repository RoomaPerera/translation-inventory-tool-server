const express = require('express');
const router = express.Router();
const { fuzzySearch } = require('../controllers/fuzzyController');

router.get('/', fuzzySearch);

module.exports = router;
