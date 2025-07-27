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
        console.log(`Subject: ${subject}`);
        console.log(`SMTP Config - Host: ${smtp.host}, Port: ${smtp.port}, User: ${smtp.user}`);
        
        const result = await transporter.sendMail({
            from: `"Translation Inventory Tool" <no-reply@translation-inventory-tool.com>`,
            to,
            subject,
            html,
        });
        console.log(`Email sent successfully to: ${to}`);
        console.log(`Message ID: ${result.messageId}`);
        return result;
    } catch (err) {
        console.error('Failed to send email: ', err);
        console.error('Full error details:', err);
        // Don't throw error - let the calling function handle it
        throw new Error(`Email sending failed: ${err.message}`);
    }
};
module.exports = { sendMail };