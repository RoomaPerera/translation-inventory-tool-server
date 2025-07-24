const express = require('express');
const router = express.Router();
const { getLanguages } = require('../controllers/authController');

// This route will handle GET /api/languages, which the frontend expects.
router.get('/', getLanguages);

module.exports = router;