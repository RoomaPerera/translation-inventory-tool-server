const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    languages: {
        type: [String],
        default: [],
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    defaultLanguage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Language',
        default: null,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Analytics fields
    totalTranslations: {
        type: Number,
        default: 0
    },
    completedTranslations: {
        type: Number,
        default: 0
    },
    pendingTranslations: {
        type: Number,
        default: 0
    },
    inProgressTranslations: {
        type: Number,
        default: 0
    },
    totalWordCount: {
        type: Number,
        default: 0
    },
    completedWordCount: {
        type: Number,
        default: 0
    },
    averageQualityScore: {
        type: Number,
        default: 0
    },
    lastActivityDate: {
        type: Date
    },
    // Performance metrics
    projectEfficiencyScore: {
        type: Number,
        default: 0
    }, // 0-100
    onTimeDeliveryRate: {
        type: Number,
        default: 0
    }, // percentage
    // Timeline tracking
    estimatedCompletionDate: {
        type: Date
    },
    actualStartDate: {
        type: Date
    },
    actualCompletionDate: {
        type: Date
    },
});

// a virtual to check if default language is set
projectSchema.virtual('hasDefaultLanguage').get(function() {
    return this.defaultLanguage != null;
});

// validation middleware to ensure defaultLanguage exists in languages array
projectSchema.pre('save', async function(next) {
    if (this.defaultLanguage && this.languages && this.languages.length > 0) {
        // We need to populate the defaultLanguage to get its code/name for comparison
        if (this.isModified('defaultLanguage') || this.isModified('languages')) {
            try {
                const Language = mongoose.model('Language');
                const defaultLang = await Language.findById(this.defaultLanguage);
                
                if (defaultLang) {
                    // Check if the default language code or name is in the languages array
                    const isInLanguages = this.languages.includes(defaultLang.code) || 
                                        this.languages.includes(defaultLang.name) ||
                                        this.languages.includes(defaultLang._id.toString());
                    
                    if (!isInLanguages) {
                        // Automatically add the default language to the languages array
                        console.log(`Adding default language ${defaultLang.code} to project languages`);
                        this.languages.push(defaultLang.code);
                    }
                }
            } catch (error) {
                console.warn('Could not validate default language:', error.message);
            }
        }
    }
    next();
});

// Ensure virtual fields are serialized
projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema);