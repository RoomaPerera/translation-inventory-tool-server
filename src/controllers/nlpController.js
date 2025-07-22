const axios = require('axios');
const Translation = require('../models/Translation'); // Import the Translation model

// URL for the Python NLP service
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
};