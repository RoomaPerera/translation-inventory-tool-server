// controllers/uploadController.js
const fs = require('fs');
const Translation = require('../models/Translation');

exports.uploadTranslations = async (req, res) => {
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

     for (const combinedKey of Object.keys(translations)) {
  const translatedText = translations[combinedKey];

  // Split into key and optional context
  const [translationKey, context] = combinedKey.split('__');  // ⬅️ e.g., "welcome__login"

  await Translation.findOneAndUpdate(
    { projectId, translationKey, language, context },
    {
      translationKey,
      language,
      translatedText,
      product: req.body.product || 'Unknown Project',
      context, // ✅ add context
      projectId,
      status: 'pending'
    },
    { upsert: true, new: true }
  );

  upsertCount++;
}

    }

    fs.unlinkSync(filePath); // Clean up temp file
    res.status(200).json({ message: `${upsertCount} translations processed successfully.` });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
};
