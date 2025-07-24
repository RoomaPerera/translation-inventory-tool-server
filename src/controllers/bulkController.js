const Translation = require('../models/Translation');
const csv = require('csv-parser');
const fs = require('fs');

// Bulk Import Translations
exports.importTranslations = async (req, res, next) => {
  const translations = [];
  try {
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
  } catch (error) {
    next(error);
  }
};

// Bulk Export Translations
exports.exportTranslations = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};
