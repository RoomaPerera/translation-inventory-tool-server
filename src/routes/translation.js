const express = require('express');
const router = express.Router();
const Translation = require('../models/Translation');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Get all localization keys
router.get('/', async (req, res) => {
  try {
    const translations = await Translation.find();
    res.json(translations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single localization key
router.get('/:key', async (req, res) => {
  try {
    const translation = await Translation.findOne({ key: req.params.key });
    if (!translation) return res.status(404).json({ error: 'Key not found' });
    res.json(translation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new localization key
router.post('/', async (req, res) => {
  try {
    const { key, translations } = req.body;

    // Check if key exists
    const existing = await Translation.findOne({ key });
    if (existing) {
      return res.status(400).json({ error: 'Key already exists' });
    }

    const newTranslation = new Translation({ key, translations });
    await newTranslation.save();

    // Find translators who translate any of the languages in this translation
    const languages = Array.from(Object.keys(translations));
    const translators = await User.find({
      role: 'translator',
      languages: { $in: languages }
    });

    console.log(`Found ${translators.length} translators for languages: ${languages.join(', ')}`);

    // Send email notifications with better error handling
    const emailPromises = translators.map(async (translator) => {
      try {
        const relevantLangs = translator.languages.filter(lang =>
          languages.includes(lang)
        );

        const emailResult = await sendEmail(
          [, translator.email],
          'New Translation Key Added',
          `Hello,

A new translation key "${key}" has been added for your language(s): ${relevantLangs.join(', ')}.

Please check it in the system.

Best regards,
Localization Team`
        );

        console.log(`Email sent to ${translator.email}`);
        return emailResult;
      } catch (error) {
        console.error(`Failed to send email to ${translator.email}:`, error.message);
        return { success: false, error: error.message, email: translator.email };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    
    // Count successful emails
    const successCount = emailResults.filter(result => result.success).length;
    const failCount = emailResults.filter(result => !result.success).length;
    
    console.log(`Email results: ${successCount} sent, ${failCount} failed`);

    res.status(201).json({
      ...newTranslation.toObject(),
      emailNotifications: {
        sent: successCount,
        failed: failCount,
        details: emailResults
      }
    });
  } catch (err) {
    console.error('Error in translation creation:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update translations for a key
router.put('/:key', async (req, res) => {
  try {
    const { translations } = req.body;
    const translation = await Translation.findOneAndUpdate(
      { key: req.params.key },
      { $set: { translations, updatedAt: new Date() } },
      { new: true }
    );
    if (!translation) return res.status(404).json({ error: 'Key not found' });
    res.json(translation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a localization key
router.delete('/:key', async (req, res) => {
  try {
    const result = await Translation.deleteOne({ key: req.params.key });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Key not found' });
    res.json({ message: 'Localization key deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;