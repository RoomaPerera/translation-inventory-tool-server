const Project = require('../models/Project');
const User = require('../models/User');
const Translation = require('../models/Translation');

// Function to update project statistics when translations change
const updateProjectStats = async (projectId) => {
    try {
        const translations = await Translation.find({ projectId });
        const completed = translations.filter(t => t.status === 'completed').length;
        const pending = translations.filter(t => t.status === 'pending').length;
        
        const totalWordCount = translations.reduce((sum, t) => {
            return sum + (t.translatedText ? t.translatedText.split(' ').length : 0);
        }, 0);

        const completedWordCount = translations
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => {
                return sum + (t.translatedText ? t.translatedText.split(' ').length : 0);
            }, 0);

        // Calculate efficiency score (simple formula: completion rate * 100)
        const completionRate = translations.length > 0 ? (completed / translations.length) : 0;
        const efficiencyScore = Math.round(completionRate * 100);

        await Project.findByIdAndUpdate(projectId, {
            totalTranslations: translations.length,
            completedTranslations: completed,
            pendingTranslations: pending,
            inProgressTranslations: translations.length - completed - pending,
            totalWordCount,
            completedWordCount,
            projectEfficiencyScore: efficiencyScore,
            lastActivityDate: new Date()
        });

        console.log(`Updated stats for project ${projectId}: ${completed}/${translations.length} completed`);
    } catch (error) {
        console.error('Error updating project stats:', error);
    }
};

// Function to update user statistics
const updateUserStats = async (userId, role) => {
    try {
        if (role === 'Translator') {
            const translations = await Translation.find({ createdBy: userId });
            const completed = translations.filter(t => t.status === 'completed').length;
            const totalWords = translations.reduce((sum, t) => {
                return sum + (t.translatedText ? t.translatedText.split(' ').length : 0);
            }, 0);

            // Calculate completion rate
            const completionRate = translations.length > 0 ? (completed / translations.length * 100) : 0;

            // Get unique projects
            const uniqueProjectIds = [...new Set(translations.map(t => t.projectId.toString()))];

            await User.findByIdAndUpdate(userId, {
                'translatorStats.totalTranslationsCompleted': completed,
                'translatorStats.totalWordsTranslated': totalWords,
                'translatorStats.onTimeDeliveryRate': Math.round(completionRate),
                totalProjectsAssigned: uniqueProjectIds.length,
                lastLoginDate: new Date()
            });

            console.log(`Updated translator stats for user ${userId}: ${completed} completed translations`);
        } 
        else if (role === 'Developer') {
            const projects = await Project.find({ createdBy: userId });
            const activeProjects = projects.filter(p => 
                (p.totalTranslations || 0) > (p.completedTranslations || 0)
            ).length;

            // Calculate project success rate (projects with > 80% completion)
            const successfulProjects = projects.filter(p => {
                const rate = p.totalTranslations > 0 ? (p.completedTranslations / p.totalTranslations) : 0;
                return rate > 0.8;
            }).length;

            const successRate = projects.length > 0 ? (successfulProjects / projects.length * 100) : 0;

            await User.findByIdAndUpdate(userId, {
                'developerStats.totalProjectsManaged': projects.length,
                'developerStats.activeProjectsManaged': activeProjects,
                'developerStats.projectSuccessRate': Math.round(successRate),
                totalProjectsAssigned: projects.length,
                activeProjects: activeProjects,
                lastLoginDate: new Date()
            });

            console.log(`Updated developer stats for user ${userId}: ${projects.length} total projects`);
        }
    } catch (error) {
        console.error('Error updating user stats:', error);
    }
};

module.exports = {
    updateProjectStats,
    updateUserStats
};