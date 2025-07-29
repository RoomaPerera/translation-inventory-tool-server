const Translation = require('../models/Translation');
const { distance } = require('fastest-levenshtein');

// In-memory cache
const cache = new Map(); // key: query string, value: top results array

// REQ-31, REQ-32, REQ-33: Fuzzy search controller
const fuzzySearch = async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ message: 'Query is required' });
    }

    // Check cache first
    if (cache.has(query)) {
        return res.status(200).json(cache.get(query));
    }

    try {
        const allTranslations = await Translation.find();
        const maxDistance = 5;

        const results = allTranslations.map(entry => {
            const score = distance(query.toLowerCase(), entry.translatedText.toLowerCase());
            return {
                translationKey: entry.translationKey,
                translatedText: entry.translatedText,
                language: entry.language,
                product: entry.product,
                similarityScore: score
            };
        });

        const filteredResults = results
            .filter(entry => entry.similarityScore <= maxDistance)
            .sort((a, b) => a.similarityScore - b.similarityScore)
            .slice(0, 10);

        // Store in cache
        cache.set(query, filteredResults);

        res.status(200).json(filteredResults);
    } catch (err) {
        console.error('Fuzzy search error:', err);
        res.status(500).json({ message: 'Fuzzy search failed', error: err.message });
    }
};

module.exports = { fuzzySearch };
