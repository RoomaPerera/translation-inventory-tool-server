//revisionController.js - UPDATED VERSION with proper diff library usage
const Translation = require('../models/Translation');
const { computeDiff } = require('../utils/diff');

/**
 * GET /api/translations/:id/revisions
 * Returns metadata about each saved revision
 */
const getRevisions = async (req, res) => {
    try {
        const { id } = req.params;
        const translation = await Translation.findById(id)
            .select('revisions createdAt createdBy translationKey language')
            .populate('revisions.author', 'userName email')
            .populate('createdBy', 'userName email');

        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }

        // Return revisions with additional context
        const response = {
            translationId: translation._id,
            translationKey: translation.translationKey,
            language: translation.language,
            revisions: translation.revisions,
            createdBy: translation.createdBy
        };

        res.json(response.revisions);
    } catch (error) {
        console.error('Error fetching revisions:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/translations/:id/diff/:revIndex
 * Compares the current text to the revision at `revIndex` (0 = most recent)
 */
const getDiff = async (req, res) => {
    try {
        const { id, revIndex } = req.params;
        const revisionIndex = parseInt(revIndex, 10);

        if (isNaN(revisionIndex) || revisionIndex < 0) {
            return res.status(400).json({ error: 'Invalid revision index' });
        }

        const translation = await Translation.findById(id);
        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }

        const revision = translation.revisions[revisionIndex];
        if (!revision) {
            return res.status(404).json({ error: 'Revision not found' });
        }

        const oldText = revision.text || '';
        const newText = translation.translatedText || '';

        // Use your library-based computeDiff function
        // This will automatically choose between character and word diff
        const diff = computeDiff(oldText, newText);

        const response = {
            translationId: translation._id,
            revisionIndex,
            oldText,
            newText,
            diff,
            revision: {
                createdAt: revision.createdAt,
                author: revision.author
            }
        };

        // Return only the diff array as expected by the frontend
        res.json(response.diff);
    } catch (error) {
        console.error('Error computing diff:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/translations/:id/revert/:revIndex
 * Reverts the translation back to the text in `revisions[revIndex]`
 */
const revertRevision = async (req, res) => {
    try {
        const { id, revIndex } = req.params;
        const revisionIndex = parseInt(revIndex, 10);
        const userId = req.user.id;

        if (isNaN(revisionIndex) || revisionIndex < 0) {
            return res.status(400).json({ error: 'Invalid revision index' });
        }

        const translation = await Translation.findById(id);
        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }

        const revision = translation.revisions[revisionIndex];
        if (!revision) {
            return res.status(404).json({ error: 'Revision not found' });
        }

        const revertText = revision.text;

        // Check if we're reverting to the same text
        if (translation.translatedText === revertText) {
            return res.status(400).json({
                error: 'Cannot revert to the same text that is already current'
            });
        }

        // Add revision (this will save the current text as a revision and update to the reverted text)
        await translation.addRevision(revertText, userId);

        // Log the revert action
        try {
            const ActivityLog = require('../models/ActivityLog');
            const User = require('../models/User');

            const user = await User.findById(userId).select('userName role');
            if (user) {
                await ActivityLog.create({
                    userId,
                    userName: user.userName,
                    role: user.role.toLowerCase(),
                    description: `Reverted translation for key: '${translation.translationKey}' to revision from ${revision.createdAt.toISOString()}`
                });
            }
        } catch (logErr) {
            console.error('ActivityLog error (revertRevision):', logErr);
        }

        const response = {
            message: 'Translation reverted successfully',
            translationId: translation._id,
            newText: revertText,
            version: translation.version,
            revertedToRevision: {
                index: revisionIndex,
                createdAt: revision.createdAt,
                author: revision.author
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error reverting revision:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/translations/:id/history
 * Returns complete history including current version and all revisions
 */
const getCompleteHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const translation = await Translation.findById(id)
            .populate('revisions.author', 'userName email')
            .populate('createdBy', 'userName email');

        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }

        const history = {
            current: {
                text: translation.translatedText,
                version: translation.version,
                updatedAt: translation.updatedAt,
                status: translation.status
            },
            revisions: translation.revisions,
            translationInfo: {
                id: translation._id,
                translationKey: translation.translationKey,
                language: translation.language,
                product: translation.product,
                createdBy: translation.createdBy,
                createdAt: translation.createdAt
            }
        };

        res.json(history);
    } catch (error) {
        console.error('Error fetching complete history:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getRevisions,
    getDiff,
    revertRevision,
    getCompleteHistory
};