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
        await transporter.sendMail({
            from: `"Translation Inventory Tool" <no-reply@translation-inventory-tool.com>`,
            to,
            subject,
            html,
        });
    } catch (err) {
        console.error('Failed to send email: ', err);
        throw new Error('Email sending failed');
    }
};
module.exports = { sendMail };