const escapeHtml = str => str.replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])
);

const resetPasswordTemplate = ({ userName, resetURL, expiryMinutes }) => `
    <p>Hi ${escapeHtml(userName)},</p>
    <p>Click the link below to set a new password:</p>
    <a href="${resetURL}">${resetURL}</a>
    <p>This link will expire in ${expiryMinutes} minutes.</p>
`;
module.exports = { resetPasswordTemplate };