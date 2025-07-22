// utils/readabilityValidator.js

const {parse} = require('csv-parse/sync');


async function computeReadabilityScores(text) {
  if (!text || typeof text !== 'string') return null;

  try {
    const readabilityModule = await import('text-readability');
    const readability = readabilityModule.default;

    return {
      fleschKincaidGrade: readability.fleschKincaidGrade(text),
      gunningFog: readability.gunningFog(text),
      smogIndex: readability.smogIndex(text),
      colemanLiauIndex: readability.colemanLiauIndex(text),
    };
  } catch (error) {
    console.error('Error loading text-readability module:', error);
    return null;
  }
}

function isHighComplexity(scores) {
  return (
    scores.fleschKincaidGrade > 12 ||
    scores.gunningFog > 12 ||
    scores.smogIndex > 12
  );
}



function validateJSONFormat(jsonContent) {
  try {
    const obj = JSON.parse(jsonContent);
    if (typeof obj !== 'object' || Array.isArray(obj)) {
      return { valid: false, error: 'JSON must be an object with key-value pairs.' };
    }
    for (const key in obj) {
      if (typeof obj[key] !== 'string') {
        return { valid: false, error: `Value for key "${key}" is not a string.` };
      }
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `JSON parsing error: ${err.message}` };
  }
}

function validateCSVFormat(csvContent) {
    try {
      const records = parse(csvContent, { columns: true, skip_empty_lines: true });
      const requiredHeaders = ['key', 'translation'];
      const headers = Object.keys(records[0] || {});
      for (const header of requiredHeaders) {
        if (!headers.includes(header)) {
          return { valid: false, error: `Missing required header: ${header}` };
        }
      }
      return { valid: true };
    } catch (err) {
      return { valid: false, error: `CSV parsing error: ${err.message}` };
    }
  }


module.exports = {
  computeReadabilityScores,
  isHighComplexity,
  validateCSVFormat,
  validateJSONFormat,
};
