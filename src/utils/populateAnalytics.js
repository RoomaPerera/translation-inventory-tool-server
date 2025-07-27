const User = require('../models/User');
const Project = require('../models/Project');
const Translation = require('../models/Translation');

const populateAnalyticsData = async () => {
    try {
        console.log('Starting analytics data population...');

        // Step 1: Update all projects with their translation statistics
        const projects = await Project.find();
        console.log(`Found ${projects.length} projects to update`);

        for (const project of projects) {
            const translations = await Translation.find({ projectId: project._id });
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

            // Calculate efficiency score
            const completionRate = translations.length > 0 ? (completed / translations.length) : 0;
            const efficiencyScore = Math.round(completionRate * 100);

            // Update project with calculated stats
            await Project.findByIdAndUpdate(project._id, {
                totalTranslations: translations.length,
                completedTranslations: completed,
                pendingTranslations: pending,
                inProgressTranslations: translations.length - completed - pending,
                totalWordCount,
                completedWordCount,
                projectEfficiencyScore: efficiencyScore,
                onTimeDeliveryRate: Math.random() * 100, // Mock data for now
                lastActivityDate: translations.length > 0 ? 
                    new Date(Math.max(...translations.map(t => new Date(t.updatedAt)))) : 
                    project.createdAt,
                actualStartDate: project.createdAt,
                estimatedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            });

            console.log(`Updated project "${project.name}": ${completed}/${translations.length} translations completed`);
        }

        // Step 2: Update all users with their statistics
        const users = await User.find({ deletedAt: null });
        console.log(`👥 Found ${users.length} users to update`);

        for (const user of users) {
            // Update common fields
            const userProjects = await Project.find({ createdBy: user._id });
            const userTranslations = await Translation.find({ createdBy: user._id });

            await User.findByIdAndUpdate(user._id, {
                totalProjectsAssigned: userProjects.length,
                activeProjects: userProjects.filter(p => 
                    (p.totalTranslations || 0) > (p.completedTranslations || 0)
                ).length
            });

            // Update role-specific stats
            if (user.role === 'Translator') {
                const completed = userTranslations.filter(t => t.status === 'completed').length;
                const totalWords = userTranslations.reduce((sum, t) => {
                    return sum + (t.translatedText ? t.translatedText.split(' ').length : 0);
                }, 0);

                const completionRate = userTranslations.length > 0 ? (completed / userTranslations.length * 100) : 0;
                const avgQuality = 3.5 + Math.random() * 1.5; // Mock quality score between 3.5-5.0

                await User.findByIdAndUpdate(user._id, {
                    'translatorStats.totalTranslationsCompleted': completed,
                    'translatorStats.totalWordsTranslated': totalWords,
                    'translatorStats.averageTranslationQuality': Math.round(avgQuality * 10) / 10,
                    'translatorStats.averageCompletionTime': Math.round((Math.random() * 5 + 1) * 10) / 10, // 1-6 hours
                    'translatorStats.productivityScore': totalWords > 0 ? Math.round(totalWords / Math.max(userTranslations.length, 1)) : 0,
                    'translatorStats.onTimeDeliveryRate': Math.round(completionRate),
                    'translatorStats.specializedLanguages': user.languages || []
                });

                console.log(`Updated translator "${user.userName}": ${completed} translations, ${totalWords} words`);
            } 
            else if (user.role === 'Developer') {
                const activeProjectsCount = userProjects.filter(p => 
                    (p.totalTranslations || 0) > (p.completedTranslations || 0)
                ).length;

                const successfulProjects = userProjects.filter(p => {
                    const rate = p.totalTranslations > 0 ? (p.completedTranslations / p.totalTranslations) : 0;
                    return rate > 0.8;
                }).length;

                const successRate = userProjects.length > 0 ? (successfulProjects / userProjects.length * 100) : 0;
                const avgDuration = 15 + Math.random() * 30; // 15-45 days

                await User.findByIdAndUpdate(user._id, {
                    'developerStats.totalProjectsManaged': userProjects.length,
                    'developerStats.activeProjectsManaged': activeProjectsCount,
                    'developerStats.teamMembersManaged': Math.floor(Math.random() * 10) + 1, // 1-10 team members
                    'developerStats.projectSuccessRate': Math.round(successRate),
                    'developerStats.averageProjectDuration': Math.round(avgDuration)
                });

                console.log(`Updated developer "${user.userName}": ${userProjects.length} projects managed`);
            }
            else if (user.role === 'Admin') {
                const totalUsers = await User.countDocuments({ deletedAt: null });
                const totalProjects = await Project.countDocuments();

                await User.findByIdAndUpdate(user._id, {
                    'adminStats.totalUsersManaged': totalUsers,
                    'adminStats.systemUptimeResponsibility': Math.round((Math.random() * 5 + 95) * 10) / 10, // 95-100%
                    'adminStats.totalSystemConfigurations': Math.floor(Math.random() * 50) + 10 // 10-60 configs
                });

                console.log(`Updated admin "${user.userName}": managing ${totalUsers} users`);
            }
        }

        console.log('Analytics data population completed successfully!');
        return {
            projectsUpdated: projects.length,
            usersUpdated: users.length,
            success: true
        };

    } catch (error) {
        console.error('Error populating analytics data:', error);
        throw error;
    }
};

module.exports = { populateAnalyticsData };