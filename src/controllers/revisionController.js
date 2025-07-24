const Translation = require('../models/Translation')
const { computeDiff } = require('../utils/diff');

/**
 * GET /api/translations/:id/revisions
 * Returns metadata about each saved revision
 */
const getRevisions = async (req, res) => {
    const { id } = req.params;
    const t = await Translation.findById(id)
        .select('revisions createdAt createdBy')
        .populate('revisions.author', 'userName email');
    if (!t) {
        return res.status(404).json({ error: 'Translation not found' });
    }
    res.json(t.revisions);
}

/**
 * GET /api/translations/:id/diff/:revIndex
 * Compares the current text to the revision at `revIndex` (0 = most recent)
 */
const getDiff = async (req, res) => {
    const { id, revIndex } = req.params;
    const t = await Translation.findById(id);
    if (!t) {
        return res.status(404).json({ error: 'Translation not found' });
    }
    const rev = t.revisions[revIndex];
    if (!rev) {
        return res.status(404).json({ error: 'Revision not found' });
    }
    const diff = computeDiff(rev.text, t.text);
    res.json(diff);
}

/**
 * POST /api/translations//revert/:id/:revIndex
 * Reverts the translation back to the text in `revisions[revIndex]`
 */
const revertRevision = async (req, res) => {
    const { id, revIndex } = req.params;
    const userId = req.user.id;
    const t = await Translation.findById(id);
    if (!t) {
        return res.status(404).json({ error: 'Translation not found' });
    }
    const rev = t.revisions[revIndex];
    if (!rev) {
        return res.status(404).json({ error: 'Revision not found' });
    }
    await t.addRevision(rev.text, userId);
    res.json({ message: 'Translation reverted', newText: t.text });
}

module.exports = {
    getRevisions,
    getDiff,
    revertRevision
}