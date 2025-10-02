const { User } = require('../models/User');
const Project = require('../models/Project');
const Translation = require('../models/Translation');

// Get dashboard overview
const getDashboardOverview = async (req, res) => {
    try {
        const [totalUsers, totalProjects, totalTranslations, activeProjects] = await Promise.all([
            User.countDocuments({ roleStatus: 'Approved', deletedAt: null }),
            Project.countDocuments(),
            Translation.countDocuments(),
            Project.countDocuments({ 
                $expr: { $gt: ['$totalTranslations', '$completedTranslations'] }
            })
        ]);

        const completedTranslations = await Translation.countDocuments({ status: 'completed' });
        const completionRate = totalTranslations > 0 ? (completedTranslations / totalTranslations * 100) : 0;

        res.json({
            totalUsers,
            totalProjects,
            totalTranslations,
            activeProjects,
            completionRate: Math.round(completionRate * 100) / 100
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get user-specific analytics
const getUserAnalytics = async (req, res) => {
    try {
        const { id, role } = req.user; // from auth middleware
        
        let analytics;
        
        switch(role) {
            case 'Translator':
                analytics = await getTranslatorAnalytics(id);
                break;
            case 'Developer':
                analytics = await getDeveloperAnalytics(id);
                break;
            case 'Admin':
                analytics = await getAdminAnalytics();
                break;
            default:
                return res.status(400).json({ error: 'Invalid role' });
        }
        
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Helper function for translator analytics
const getTranslatorAnalytics = async (userId) => {
    const translations = await Translation.find({ createdBy: userId });
    const completedTranslations = translations.filter(t => t.status === 'completed');
    
    const totalWordCount = translations.reduce((sum, t) => {
        return sum + (t.translatedText ? t.translatedText.split(' ').length : 0);
    }, 0);

    const projects = await Project.find({ 
        _id: { $in: translations.map(t => t.projectId) }
    });

    // Get user record to access real stats
    const user = await User.findById(userId);

    return {
        totalTranslations: translations.length,
        completedTranslations: completedTranslations.length,
        totalWordCount,
        activeProjects: projects.length,
        completionRate: translations.length > 0 ? 
            (completedTranslations.length / translations.length * 100) : 0,
        
        // Return real translator stats from database
        translatorStats: {
            totalTranslationsCompleted: user?.translatorStats?.totalTranslationsCompleted || completedTranslations.length,
            totalWordsTranslated: user?.translatorStats?.totalWordsTranslated || totalWordCount,
            averageTranslationQuality: user?.translatorStats?.averageTranslationQuality || null,
            averageCompletionTime: user?.translatorStats?.averageCompletionTime || null,
            productivityScore: user?.translatorStats?.productivityScore || Math.round(totalWordCount / Math.max(translations.length, 1)),
            onTimeDeliveryRate: user?.translatorStats?.onTimeDeliveryRate || Math.round((completedTranslations.length / Math.max(translations.length, 1)) * 100)
        },
        
        recentActivity: translations.slice(-5).map(t => ({
            translationKey: t.translationKey,
            language: t.language,
            status: t.status,
            updatedAt: t.updatedAt
        }))
    };
};

// Helper function for developer analytics
const getDeveloperAnalytics = async (userId) => {
    const projects = await Project.find({ createdBy: userId });
    const projectIds = projects.map(p => p._id);
    
    const translations = await Translation.find({ 
        projectId: { $in: projectIds }
    });

    // Get user record for real stats
    const user = await User.findById(userId);

    return {
        totalProjectsManaged: projects.length,
        totalTranslations: translations.length,
        activeProjects: projects.filter(p => p.totalTranslations > p.completedTranslations).length,
        
        // Return real developer stats
        developerStats: {
            totalProjectsManaged: user?.developerStats?.totalProjectsManaged || projects.length,
            activeProjectsManaged: user?.developerStats?.activeProjectsManaged || projects.filter(p => p.totalTranslations > p.completedTranslations).length,
            teamMembersManaged: user?.developerStats?.teamMembersManaged || 0,
            projectSuccessRate: user?.developerStats?.projectSuccessRate || 0,
            averageProjectDuration: user?.developerStats?.averageProjectDuration || 0
        },
        
        recentProjects: projects.slice(-5).map(p => ({
            name: p.name,
            totalTranslations: p.totalTranslations || 0,
            completedTranslations: p.completedTranslations || 0,
            createdAt: p.createdAt
        }))
    };
};

// Helper function for admin analytics
const getAdminAnalytics = async () => {
    const [users, projects, translations] = await Promise.all([
        User.find({ deletedAt: null }),
        Project.find(),
        Translation.find()
    ]);

    const usersByRole = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
    }, {});

    const translationsByStatus = translations.reduce((acc, translation) => {
        acc[translation.status] = (acc[translation.status] || 0) + 1;
        return acc;
    }, {});

    return {
        totalUsers: users.length,
        totalProjects: projects.length,
        totalTranslations: translations.length,
        usersByRole,
        translationsByStatus,
        recentUsers: users.slice(-5).map(u => ({
            userName: u.userName,
            role: u.role,
            roleStatus: u.roleStatus,
            createdAt: u.createdAt
        }))
    };
};

// Get chart data
const getChartData = async (req, res) => {
    try {
        const { period } = req.query; // '7d' or '30d'
        const days = period === '30d' ? 30 : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const translations = await Translation.find({
            createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });

        const chartData = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayTranslations = translations.filter(t => 
                t.createdAt.toISOString().split('T')[0] === dateStr
            );

            chartData.push({
                date: dateStr,
                translations: dayTranslations.length,
                completed: dayTranslations.filter(t => t.status === 'completed').length
            });
        }

        res.json(chartData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Export analytics
const exportAnalytics = async (req, res) => {
    try {
        const { format } = req.query; // 'csv' or 'json'
        
        const [totalUsers, totalProjects, totalTranslations] = await Promise.all([
            User.countDocuments({ roleStatus: 'Approved', deletedAt: null }),
            Project.countDocuments(),
            Translation.countDocuments()
        ]);

        const overview = {
            totalUsers,
            totalProjects,
            totalTranslations,
            exportedAt: new Date()
        };
        
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
            
            const csv = Object.entries(overview)
                .map(([key, value]) => `${key},${value}`)
                .join('\n');
            res.send(`Metric,Value\n${csv}`);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=analytics.json');
            res.json(overview);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getDashboardOverview,
    getUserAnalytics,
    getChartData,
    exportAnalytics
};