// controllers/translationValidationController.js

const {
  computeReadabilityScores,
  isHighComplexity,
  validateCSVFormat,
  validateJSONFormat,
} = require('../utils/readabilityValidator');

const { parse } = require('csv-parse/sync');
const FileValidationLog = require('../models/FileValidationLog');

exports.validateTranslation = async (req, res) => {
  try {
    const { text, fileContent, fileType, fileName } = req.body;

    if (!text && !fileContent) {
      return res.status(400).json({ error: 'Either text or fileContent must be provided.' });
    }

    let readabilityScores = null;
    let highComplexityFlag = false;
    let fileValidationResult = null;

    if (text) {
      readabilityScores = await computeReadabilityScores(text);
      highComplexityFlag = isHighComplexity(readabilityScores);

      if (
        (fileType && fileType.toLowerCase() === 'json') ||
        (text.trim().startsWith('{') && text.trim().endsWith('}'))
      ) {
        fileValidationResult = validateJSONFormat(text);
      } else if (
        (fileType && fileType.toLowerCase() === 'csv') ||
        (text.includes(',') && text.includes('\n'))
      ) {
        try {
          fileValidationResult = validateCSVFormat(text);
        } catch (error) {
          fileValidationResult = { valid: false, error: `CSV parsing error: ${error.message}` };
        }

        // Always parse for readability regardless of validation pass/fail
        try {
          const records = parse(text, { columns: true, skip_empty_lines: true });
          const textForReadability = records
            .map(row =>
              Object.entries(row)
                .map(([key, value]) => `${key}: ${value}`)
                .join('. ')
            )
            .join('. ');
          readabilityScores = await computeReadabilityScores(textForReadability);
          highComplexityFlag = isHighComplexity(readabilityScores);
        } catch (error) {
          console.error('CSV parsing for readability failed:', error.message);
        }
      }
    }

    if (fileContent) {
      if (!fileType || !['csv', 'json'].includes(fileType.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid or missing fileType. Must be "csv" or "json".' });
      }

      try {
        if (fileType.toLowerCase() === 'csv') {
          try {
            fileValidationResult = validateCSVFormat(fileContent);
          } catch (error) {
            fileValidationResult = { valid: false, error: `CSV parsing error: ${error.message}` };
          }

          // Always parse for readability regardless of validation pass/fail
          try {
            const records = parse(fileContent, { columns: true, skip_empty_lines: true });
            const textForReadability = records
              .map(row =>
                Object.entries(row)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join('. ')
              )
              .join('. ');
            readabilityScores = await computeReadabilityScores(textForReadability);
            highComplexityFlag = isHighComplexity(readabilityScores);
          } catch (error) {
            console.error('CSV parsing for readability failed:', error.message);
          }
        } else {
          fileValidationResult = validateJSONFormat(fileContent);
          const jsonObj = JSON.parse(fileContent);
          if (typeof jsonObj === 'object' && !Array.isArray(jsonObj)) {
            const textForReadability = Object.entries(jsonObj)
              .map(([key, value]) => `${key}: ${value}`)
              .join('. ');
            readabilityScores = await computeReadabilityScores(textForReadability);
            highComplexityFlag = isHighComplexity(readabilityScores);
          }
        }
      } catch (error) {
        return res.status(400).json({
          valid: false,
          error: `File parsing error: ${error.message}`,
        });
      }
    }

    // Compute summary for readability
    let readabilitySummary = null;
    if (readabilityScores) {
      const avgScore = (
        (readabilityScores.fleschKincaidGrade +
          readabilityScores.gunningFog +
          readabilityScores.smogIndex +
          readabilityScores.colemanLiauIndex) / 4
      ).toFixed(1);
      readabilitySummary = `${avgScore}/20`;
    }

    // Determine complexity label
    let complexityLabel = null;
    if (highComplexityFlag) {
      complexityLabel = 'High';
    } else if (readabilityScores) {
      complexityLabel = 'Normal';
    }

    // Save validation log
    await FileValidationLog.create({
      fileName: fileName || null,
      complexity: complexityLabel,
      readabilityScores,
      readabilitySummary,
      validationResult: {
        readabilityScores,
        highComplexity: highComplexityFlag,
        fileValidation: fileValidationResult,
        complexityMessage: highComplexityFlag ? 'Warning: The text is complex and may be hard to read.' : undefined,
        fileErrorMessage:
          fileValidationResult?.valid === false ? fileValidationResult.error : undefined,
      },
    });

    return res.json({
      readabilityScores,
      highComplexity: highComplexityFlag,
      fileValidation: fileValidationResult,
      complexityMessage: highComplexityFlag ? 'Warning: The text is complex and may be hard to read.' : undefined,
      fileErrorMessage: fileValidationResult?.valid === false ? fileValidationResult.error : undefined,
    });
  } catch (error) {
    console.error('validateTranslation error:', error);
    return res.status(500).json({ error: 'Server error during validation.' });
  }
};
