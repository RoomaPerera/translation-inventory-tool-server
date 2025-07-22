// routes/developerRoutes.js
const express = require('express');
const router = express.Router();

const upload = require('../middleware/multerConfig');
const { generateTranslations } = require('../controllers/developerController');
const { uploadTranslations } = require('../controllers/uploadController');

// REQ-19: Generate translations (JSON or CSV)
router.get('/projects/:projectId/translations/generate', generateTranslations);

// REQ-20: Upload translations via JSON file
router.post('/projects/:projectId/translations/upload', upload.single('file'), uploadTranslations);

module.exports = router;
