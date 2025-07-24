const axios = require('axios');
const Translation = require('../models/Translation');
const NLP_SERVICE_URL = 'http://localhost:8000';

// Suggest similar translations
exports.suggestTranslations = async (req, res, next) => {
  try {
    const { text, product } = req.body;
    if (!text || !product) {
      return res.status(400).json({ error: "Text and product are required." });
    }
    const existingTranslations = await Translation.find({
        product: product,
        status: 'approved',
    }).lean();
    const response = await axios.post(`${NLP_SERVICE_URL}/suggest`, {
      text: text,
      translations: existingTranslations
    });
    res.status(200).json(response.data);
  } catch (error) {
    next(error);
  }
};

// Extract glossary terms
exports.extractGlossary = async (req, res, next) => {
  try {
    const { text, product } = req.body;
    if (!text) {
        return res.status(400).json({ error: "Text is required for glossary." });
    }

    // Step 1 & 2: Get lowercase terms (Works)
    const nlpResponse = await axios.post(`${NLP_SERVICE_URL}/glossary`, { text });
    const glossarySuggestions = nlpResponse.data.glossary; // e.g., [{ term: 'developer' }]
    if (!glossarySuggestions || glossarySuggestions.length === 0) {
        return res.status(200).json({ glossary: [] });
    }
    const termsToSearch = glossarySuggestions.map(g => g.term);

    // Step 3: DB Query (This now works, as confirmed by your logs)
    const searchRegex = termsToSearch.map(t => new RegExp(`^${t}$`, 'i'));
    const approvedTranslations = await Translation.find({
        translationKey: { $in: searchRegex },
        status: 'approved',
        ...(product && { product })
    }).sort({ updatedAt: -1 });

    // === THIS IS THE CORRECTED LOGIC ===
    // Step 4: Create the lookup map correctly.
    // We will build a map where the key is the lowercase version of the translationKey
    // and the value is the translatedText.
    const translationMap = new Map();
    for (const doc of approvedTranslations) {
        const key = doc.translationKey.toLowerCase();
        if (!translationMap.has(key)) {
            translationMap.set(key, doc.translatedText);
        }
    }
    
    // Step 5: Enhance the glossary by looking up each term in our new map.
    const enhancedGlossary = glossarySuggestions.map(item => {
        // `item.term` is already lowercase from the NLP service (e.g., 'developer')
        const translatedText = translationMap.get(item.term);
        return {
            term: item.term,
            // If the map has a translation for our term, use it. Otherwise, keep it empty.
            translation: translatedText || ""
        };
    });

    res.status(200).json({ glossary: enhancedGlossary });

  } catch (error) {
    console.error("Glossary Error:", error);
    next(error);
  }
};