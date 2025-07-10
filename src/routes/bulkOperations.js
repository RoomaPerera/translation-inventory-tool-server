const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Translation = require('../models/Translation');
const { importTranslations, exportTranslations } = require('../controllers/bulkController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Bulk Import
router.post('/import', upload.single('file'), async (req, res) => {
  const translations = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      translations.push({
        translationKey: row.key,
        language: row.language,
        translatedText: row.text,
        product: row.product,
        createdBy: req.user.id
      });
    })
    .on('end', async () => {
      await Translation.insertMany(translations);
      res.json({ message: 'Bulk Import Successful' });
    });
});

// Bulk Export
router.get('/export', async (req, res) => {
  const translations = await Translation.find({});
  const csvData = translations.map(t => ({
    key: t.translationKey,
    language: t.language,
    text: t.translatedText,
    product: t.product
  }));
  res.setHeader('Content-Type', 'text/csv');
  res.attachment('translations.csv');
  res.send(csvData);
});

module.exports = router;
