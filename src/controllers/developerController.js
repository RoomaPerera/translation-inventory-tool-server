// controllers/developerController.js
const Translation = require('../models/Translation');
const Project = require('../models/Project');
const { Parser } = require('json2csv');

exports.generateTranslations = async (req, res) => {
  const { projectId } = req.params;
  const { format = 'json' } = req.query;

  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const translations = await Translation.find({ projectId });
    if (translations.length === 0)
      return res.status(404).json({ error: 'No translations found for this project' });

    if (format === 'csv') {
      const fields = ['translationKey', 'language', 'translatedText', 'context'];
      const parser = new Parser({ fields });
      const csv = parser.parse(translations);

      res.setHeader('Content-Disposition', `attachment; filename=${project.name}_translations.csv`);
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csv);
    } else {
      const jsonMap = {};
      translations.forEach(t => {
        if (!jsonMap[t.language]) jsonMap[t.language] = {};

const key = t.context ? `${t.translationKey}__${t.context}` : t.translationKey;
jsonMap[t.language][key] = t.translatedText;

      });

      res.setHeader('Content-Disposition', `attachment; filename=${project.name}_translations.json`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(JSON.stringify(jsonMap, null, 2));
    }

  } catch (error) {
    console.error('Translation generation error:', error);
    res.status(500).json({ error: error.message });
  }
};
