const Translation = require('../models/Translation');
const Project = require('../models/Project');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// Helper function to get date range
const getDateRange = (timeRange) => {
  const end = new Date();
  const start = new Date();
  
  switch (timeRange) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setDate(end.getDate() - 7);
  }
  
  return { start, end };
};

// Helper function to calculate word count
const calculateWordCount = (text) => {
  return text ? text.split(' ').filter(word => word.length > 0).length : 0;
};

// Get all dashboard data
const getAllDashboardData = async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    const { start, end } = getDateRange(timeRange);

    // Get KPIs
    const kpis = await calculateKPIs(start, end);
    
    // Get chart data
    const qualityTrend = await getQualityTrend(start, end);
    const processingTimes = await getProcessingTimes(start, end);
    const productivity = await getProductivity(start, end);
    const projectStatus = await getProjectStatus();

    res.json({
      kpis,
      qualityTrend,
      processingTimes,
      productivity,
      projectStatus
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// Calculate KPIs
const calculateKPIs = async (start, end) => {
  try {
    // Total translations in period
    const totalTranslations = await Translation.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });

    // Completed translations
    const completedTranslations = await Translation.countDocuments({
      status: 'completed',
      createdAt: { $gte: start, $lte: end }
    });

    // Average processing time (hours between created and updated)
    const translationsWithTime = await Translation.find({
      createdAt: { $gte: start, $lte: end },
      updatedAt: { $exists: true }
    }).select('createdAt updatedAt');

    let totalProcessingHours = 0;
    translationsWithTime.forEach(t => {
      const hours = (new Date(t.updatedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
      totalProcessingHours += hours;
    });

    const averageProcessingTime = translationsWithTime.length > 0 
      ? (totalProcessingHours / translationsWithTime.length).toFixed(1)
      : 0;

    // Active translators (users who created translations in period)
    const activeTranslators = await Translation.distinct('createdBy', {
      createdAt: { $gte: start, $lte: end }
    });

    // Total words (estimate based on translated text)
    const translations = await Translation.find({
      createdAt: { $gte: start, $lte: end }
    }).select('translatedText');

    const totalWords = translations.reduce((total, t) => {
      return total + calculateWordCount(t.translatedText);
    }, 0);

    // Productivity (words per day)
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const translatorProductivity = Math.round(totalWords / days);

    // Quality score (simulate based on completed vs total ratio)
    const qualityScore = totalTranslations > 0 
      ? ((completedTranslations / totalTranslations) * 10).toFixed(1)
      : 0;

    return {
      averageQualityScore: qualityScore,
      qualityTrend: 0, // You can calculate this by comparing with previous period
      averageProcessingTime: averageProcessingTime,
      processingTimeTrend: 0, // You can calculate this by comparing with previous period
      translatorProductivity: translatorProductivity,
      completedProjects: completedTranslations,
      completedProjectsTrend: 0, // You can calculate this by comparing with previous period
      activeTranslators: activeTranslators.length,
      totalWords: totalWords
    };
  } catch (error) {
    console.error('KPI calculation error:', error);
    return {};
  }
};

// Get quality trend data
const getQualityTrend = async (start, end) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          date: "$_id",
          score: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { $multiply: [{ $divide: ["$completed", "$total"] }, 10] }
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ];

    const result = await Translation.aggregate(pipeline);
    return result;
  } catch (error) {
    console.error('Quality trend error:', error);
    return [];
  }
};

// Get processing times by translator
const getProcessingTimes = async (start, end) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          updatedAt: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $group: {
          _id: '$createdBy',
          translator: { $first: '$user.userName' },
          avgTime: {
            $avg: {
              $divide: [
                { $subtract: ['$updatedAt', '$createdAt'] },
                1000 * 60 * 60 // Convert to hours
              ]
            }
          },
          completed: { $sum: 1 }
        }
      },
      {
        $project: {
          translator: 1,
          avgTime: { $round: ['$avgTime', 1] },
          completed: 1
        }
      },
      { $sort: { avgTime: 1 } }
    ];

    const result = await Translation.aggregate(pipeline);
    return result;
  } catch (error) {
    console.error('Processing times error:', error);
    return [];
  }
};

// Get daily productivity
const getProductivity = async (start, end) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          words: {
            $sum: {
              $size: {
                $split: [
                  { $trim: { input: "$translatedText" } },
                  " "
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          date: "$_id",
          words: 1
        }
      },
      { $sort: { date: 1 } }
    ];

    const result = await Translation.aggregate(pipeline);
    return result;
  } catch (error) {
    console.error('Productivity error:', error);
    return [];
  }
};

// Get project status distribution
const getProjectStatus = async () => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ];

    const result = await Translation.aggregate(pipeline);
    
    // Map to chart format with colors
    const statusMap = {
      'completed': { name: 'Completed', color: '#10b981' },
      'pending': { name: 'Pending', color: '#f59e0b' },
      'in-progress': { name: 'In Progress', color: '#3b82f6' }
    };

    return result.map(item => ({
      name: statusMap[item._id]?.name || item._id,
      value: item.count,
      color: statusMap[item._id]?.color || '#6b7280'
    }));
  } catch (error) {
    console.error('Project status error:', error);
    return [];
  }
};

// Export data (placeholder - implement based on your needs)
const exportDashboardData = async (req, res) => {
  try {
    const { format, timeRange = '7d' } = req.query;
    const { start, end } = getDateRange(timeRange);
    
    // Get all data
    const data = {
      kpis: await calculateKPIs(start, end),
      qualityTrend: await getQualityTrend(start, end),
      processingTimes: await getProcessingTimes(start, end),
      productivity: await getProductivity(start, end),
      projectStatus: await getProjectStatus()
    };

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-report.json');
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    } else {
      // For PDF/Excel, you'd need additional libraries
      res.status(400).json({ error: 'Export format not supported yet' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

module.exports = {
  getAllDashboardData,
  exportDashboardData
};