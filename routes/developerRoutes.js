const express = require('express');
const router = express.Router();
const Translation = require('../models/Translation');
const Project = require('../models/Project');
const TranslationKey  = require('../models/translationKey');

// GET: Generate translation files for a project
router.get('/projects/:projectId/translations/generate', async (req, res) => {
  const { projectId } = req.params;

  try {
    // 1. Check if the project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 2. Get all translations for that project
    const translations = await Translation.find({ projectId });

    // 3. Group by language
    const files = {};

    for (const translation of translations) {
      const { language, key, value } = translation;

      if (!files[language]) {
        files[language] = {};
      }

      files[language][key] = value;
    }

    // 4. Send as response
    res.json({
      message: "Translation files generated successfully",
      files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
