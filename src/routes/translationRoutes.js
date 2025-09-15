//routes/translationRoutes.js

const express = require('express');
const router = express.Router();
const { qualityCheck } = require('../controllers/translationController');

router.post('/quality-check', qualityCheck);

module.exports = router;
