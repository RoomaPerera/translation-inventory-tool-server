const axios = require('axios');
const Translation = require('../models/Translation');

const NLP_SERVICE_URL = 'http://localhost:8000';


// Suggest similar translations
exports.suggestTranslations = async (req, res) => {
    try {
        const { text, product } = req.body; // Expect text and product from the frontend

        if (!text || !product) {
            return res.status(400).json({ error: "Text and product are required for suggestions." });
        }

        // 1. Fetch relevant, approved translations from our MongoDB database.
        // We only want to suggest from high-quality, approved sources.
        const existingTranslations = await Translation.find({
            product: product,      // Match the current product
            status: 'approved',  // Only suggest approved translations
        }).lean(); // .lean() makes the query faster

        // 2. Call the Python NLP service with the text and the translations we just fetched.
        const response = await axios.post(`${NLP_SERVICE_URL}/suggest`, {
            text: text,
            translations: existingTranslations // Pass the fetched translations
        });

        res.status(200).json(response.data);

    } catch (error) {
        console.error("Suggest Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "NLP suggestion service failed" });
    }
};

// Extract glossary terms (this remains a simple proxy)
exports.extractGlossary = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Text is required for glossary extraction." });
        }

        const response = await axios.post(`${NLP_SERVICE_URL}/glossary`, { text });
        res.status(200).json(response.data);

    } catch (error) {
        console.error("Glossary Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Glossary extraction failed" });
    }
=======
// This function does not need changes.
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
