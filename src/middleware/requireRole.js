module.exports = function (requireRole) {
    return (req, res, next) => {
        if (!req.user || req.user.role !== requireRole) {
            return res.status(403).json({ error: 'Insufficient rights' });
        }
        next();
    }
};