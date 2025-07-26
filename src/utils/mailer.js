const nodemailer = require('nodemailer');
const { smtp } = require('../config/config');

const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: false,
    auth: {
        user: smtp.user,
        pass: smtp.pass
    },
});

async function sendMail({ to, subject, html }) {
    try {
        console.log(`Attempting to send email to: ${to}`);
        const result = await transporter.sendMail({
            from: `"Translation Inventory Tool" <no-reply@translation-inventory-tool.com>`,
            to,
            subject,
            html,
        });
        console.log(`Email sent successfully to: ${to}`);
        return result;
    } catch (err) {
        console.error('Failed to send email: ', err);
        // Don't throw error - let the calling function handle it
        throw new Error(`Email sending failed: ${err.message}`);
    }
};
module.exports = { sendMail };