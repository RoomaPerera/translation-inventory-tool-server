const express = require('express');
const router = express.Router();
const Translation = require('../models/Translation');
const Project = require('../models/Project');
const { Parser } = require('json2csv');
const multer = require('multer');
const fs = require('fs');

// GET: Generate and download translation files as ZIP
router.get('/projects/:projectId/translations/generate', async (req, res) => {
  const { projectId } = req.params;
  const { format = 'json' } = req.query;

  try {
    // 1. Validate project
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // 2. Fetch all translations for the project
    const translations = await Translation.find({ projectId });

    if (translations.length === 0)
      return res.status(404).json({ error: 'No translations found for this project' });

    // 3. Convert to desired format
    if (format === 'csv') {
      const fields = ['translationKey', 'language', 'translatedText'];
      const parser = new Parser({ fields });
      const csv = parser.parse(translations);

      res.setHeader('Content-Disposition', `attachment; filename=${project.name}_translations.csv`);
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csv);
    } else {
      // Default: JSON
      const jsonMap = {};
      translations.forEach(t => {
        if (!jsonMap[t.language]) jsonMap[t.language] = {};
        jsonMap[t.language][t.translationKey] = t.translatedText;
      });

      res.setHeader('Content-Disposition', `attachment; filename=${project.name}_translations.json`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(JSON.stringify(jsonMap, null, 2));
    }


  } catch (error) {
    console.error('Translation generation error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Configure multer for JSON upload
const upload = multer({ dest: 'uploads/' }); // store in temp folder

// POST: Upload and replace translations from a JSON file
router.post('/projects/:projectId/translations/upload', upload.single('file'), async (req, res) => {
  const { projectId } = req.params;
  const filePath = req.file?.path;

  if (!filePath) {
    return res.status(400).json({ error: 'File not uploaded' });
  }

  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(rawData);

    let upsertCount = 0;

    for (const language of Object.keys(jsonData)) {
      const translations = jsonData[language];

      for (const key of Object.keys(translations)) {
        const translatedText = translations[key];

        // Upsert (update if exists, insert if not)
        await Translation.findOneAndUpdate(
          { projectId, translationKey: key, language },
          {
            translationKey: key,
            language,
            translatedText,
            product: req.body.product || 'Unknown Project',
            projectId,
            status: 'pending'
          },
          { upsert: true, new: true }
        );

        upsertCount++;
      }
    }

    fs.unlinkSync(filePath); // cleanup temp file
    res.status(200).json({ message: `${upsertCount} translations processed successfully.` });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
});


module.exports = router;
