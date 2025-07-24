// routes/translationValidationRoutes.js

const express = require('express');
const router = express.Router();
const { validateTranslation } = require('../controllers/translationValidationController');

router.post('/validate', validateTranslation);

module.exports = router;

