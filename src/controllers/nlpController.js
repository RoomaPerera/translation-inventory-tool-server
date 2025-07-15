const axios = require('axios');

// Suggest similar translations
exports.suggestTranslations = async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8000/suggest', {
      text: req.body.text,
      translations: req.body.translations || []
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Suggest Error:", error.message);
    res.status(500).json({ error: "NLP suggestion failed" });
  }
};

// Extract glossary terms
exports.extractGlossary = async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8000/glossary', {
      text: req.body.text
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Glossary Error:", error.message);
    res.status(500).json({ error: "Glossary extraction failed" });
  }
};
