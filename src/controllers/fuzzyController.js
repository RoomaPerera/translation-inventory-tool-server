const Translation = require('../models/Translation');
const Project = require('../models/Project');
const Language = require('../models/Language');
const { distance } = require('fastest-levenshtein');

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Enhanced fuzzy search with multiple matching strategies
// Supports searching across Projects, Languages, and Translations
const fuzzySearch = async (req, res) => {
  const { query, type } = req.query;
  
  if (!query || !type) {
    return res.status(400).json({ message: 'Query and type are required' });
  }

  const cacheKey = `${type}-${query}`;
  const now = Date.now();
  
  // Check cache with TTL
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }
    cache.delete(cacheKey);
  }

  try {
    let results = [];
    const queryLower = query.toLowerCase().trim();

    // Search based on type
    switch (type) {
      case 'project':
        const projects = await Project.find();
        for (const entry of projects) {
          const matchResult = calculateMatchScore(queryLower, entry.name.toLowerCase().trim());
          if (matchResult.isMatch) {
            results.push({
              id: entry._id,
              name: entry.name,
              description: entry.description,
              type: 'project',
              similarityScore: matchResult.score,
              matchType: matchResult.type,
              matchedField: entry.name
            });
          }
          
          // Also search in description if it exists
          if (entry.description) {
            const descMatchResult = calculateMatchScore(queryLower, entry.description.toLowerCase().trim());
            if (descMatchResult.isMatch) {
              results.push({
                id: entry._id,
                name: entry.name,
                description: entry.description,
                type: 'project',
                similarityScore: descMatchResult.score,
                matchType: descMatchResult.type,
                matchedField: entry.description
              });
            }
          }
        }
        break;

      case 'language':
        const languages = await Language.find();
        for (const entry of languages) {
          const nameMatchResult = calculateMatchScore(queryLower, entry.name.toLowerCase().trim());
          if (nameMatchResult.isMatch) {
            results.push({
              id: entry._id,
              name: entry.name,
              code: entry.code,
              type: 'language',
              similarityScore: nameMatchResult.score,
              matchType: nameMatchResult.type,
              matchedField: entry.name
            });
          }
          
          // Also search in code
          const codeMatchResult = calculateMatchScore(queryLower, entry.code.toLowerCase().trim());
          if (codeMatchResult.isMatch) {
            results.push({
              id: entry._id,
              name: entry.name,
              code: entry.code,
              type: 'language',
              similarityScore: codeMatchResult.score,
              matchType: codeMatchResult.type,
              matchedField: entry.code
            });
          }
        }
        break;

      case 'key':
      case 'text':
        const allTranslations = await Translation.find();
        for (const entry of allTranslations) {
          let targetField = getTargetField(entry, type);
          
          if (!targetField) continue;
          
          const targetLower = targetField.toLowerCase().trim();
          const matchResult = calculateMatchScore(queryLower, targetLower);
          
          if (matchResult.isMatch) {
            results.push({
              id: entry._id,
              translationKey: entry.translationKey,
              translatedText: entry.translatedText,
              language: entry.language,
              product: entry.product,
              type: 'translation',
              similarityScore: matchResult.score,
              matchType: matchResult.type,
              matchedField: targetField
            });
          }
        }
        break;

      default:
        return res.status(400).json({ message: 'Invalid search type. Use: project, language, key, or text' });
    }

    // Sort by score (lower is better) and match type priority
    results.sort((a, b) => {
      // Prioritize exact and starts-with matches
      const priorityOrder = { 'exact': 0, 'starts-with': 1, 'contains': 2, 'fuzzy': 3 };
      const aPriority = priorityOrder[a.matchType] || 4;
      const bPriority = priorityOrder[b.matchType] || 4;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.similarityScore - b.similarityScore;
    });

    const topResults = results.slice(0, 15); // Increased limit for better results
    
    // Cache with timestamp
    cache.set(cacheKey, {
      data: topResults,
      timestamp: now
    });

    res.status(200).json(topResults);
  } catch (err) {
    console.error('Fuzzy search error:', err);
    res.status(500).json({ message: 'Fuzzy search failed', error: err.message });
  }
};

// Helper function to get the target field based on search type (for translations only)
function getTargetField(entry, type) {
  switch (type) {
    case 'key': return entry.translationKey;
    case 'text': return entry.translatedText;
    default: return null;
  }
}

// Enhanced matching with multiple strategies
function calculateMatchScore(query, target) {
  // Strategy 1: Exact match
  if (query === target) {
    return { isMatch: true, score: 0, type: 'exact' };
  }

  // Strategy 2: Starts with (great for autocomplete)
  if (target.startsWith(query)) {
    return { isMatch: true, score: target.length - query.length, type: 'starts-with' };
  }

  // Strategy 3: Contains (substring match)
  if (target.includes(query)) {
    const index = target.indexOf(query);
    return { isMatch: true, score: index + 100, type: 'contains' }; // +100 to rank after starts-with
  }

  // Strategy 4: Enhanced fuzzy matching
  const levenshteinDist = distance(query, target);
  let maxAllowedDistance;
  
  // More generous thresholds for short queries
  if (query.length <= 3) {
    maxAllowedDistance = 2; // Allow 2 edits for very short queries
  } else if (query.length <= 5) {
    maxAllowedDistance = Math.ceil(query.length * 0.5); // 50% for short queries
  } else {
    maxAllowedDistance = Math.floor(query.length * 0.4); // 40% for longer queries
  }
  
  if (levenshteinDist <= maxAllowedDistance) {
    return { isMatch: true, score: levenshteinDist + 200, type: 'fuzzy' };
  }

  // Strategy 5: Partial word matching (for compound words/phrases)
  const queryWords = query.split(/\s+/);
  const targetWords = target.split(/\s+/);
  
  for (const qWord of queryWords) {
    for (const tWord of targetWords) {
      if (qWord.length > 2) { // Only check meaningful words
        const wordDist = distance(qWord, tWord);
        const wordMaxDist = Math.floor(qWord.length * 0.3);
        
        if (wordDist <= wordMaxDist) {
          return { isMatch: true, score: wordDist + 300, type: 'word-fuzzy' };
        }
        
        if (tWord.includes(qWord) || qWord.includes(tWord)) {
          return { isMatch: true, score: Math.abs(tWord.length - qWord.length) + 250, type: 'word-contains' };
        }
      }
    }
  }

  return { isMatch: false, score: Infinity, type: 'no-match' };
}

// Optional: Clear old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, CACHE_TTL);

module.exports = { fuzzySearch };