const escapeHtml = str => str.replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])
);

const resetPasswordTemplate = ({ userName, resetURL, expiryMinutes }) => `
    <p>Hi ${escapeHtml(userName)},</p>
    <p>Click the link below to set a new password:</p>
    <a href="${resetURL}">${resetURL}</a>
    <p>This link will expire in ${expiryMinutes} minutes.</p>
`;

const approvalTemplate = ({ userName, frontendURL }) => `
    <p>Hi ${escapeHtml(userName)},</p>
    <p>Your account has been <strong>approved</strong> by our admin team!</p>
    <p>You can now log in here:</p>
    <a href="${frontendURL}/login">${frontendURL}/login</a>
    <p>Welcome aboard!</p>
`;

const rejectionTemplate = ({ userName }) => `
    <p>Hi ${escapeHtml(userName)},</p>
    <p>We’re sorry to let you know that your registration request was <strong>rejected</strong>.</p>
    <p>If you believe this was in error, please contact support.</p>
`;

module.exports = {
    resetPasswordTemplate,
    approvalTemplate,
    rejectionTemplate
};
