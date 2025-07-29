const nodemailer = require('nodemailer');
const { smtp } = require('../config/config');

// Create transporter with basic validation
let transporter;
try {
    // Check if SMTP configuration exists
    if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass) {
        console.error('Missing SMTP configuration. Please check your .env file.');
        console.error('Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
    } else {
        transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.port === 465, // true for 465, false for other ports
            auth: {
                user: smtp.user,
                pass: smtp.pass
            },
            // Extended timeout settings for better reliability with multiple emails
            connectionTimeout: 120000, // 120 seconds (2 minutes)
            greetingTimeout: 60000,    // 60 seconds
            socketTimeout: 120000,     // 120 seconds (2 minutes)
        });
        
        console.log('Email transporter configured successfully');
    }
} catch (error) {
    console.error('Failed to create email transporter:', error.message);
}

async function sendMail({ to, subject, html }) {
    try {
        // Check if transporter is available
        if (!transporter) {
            throw new Error('Email transporter not configured. Check SMTP settings.');
        }
        
        // Validate input parameters
        if (!to || !subject || !html) {
            throw new Error('Missing required parameters: to, subject, or html');
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            throw new Error(`Invalid email format: ${to}`);
        }
        
        console.log(`Sending email to: ${to}`);
        console.log(`Subject: ${subject}`);
        
        const mailOptions = {
            from: `"Translation Inventory Tool" <${smtp.user}>`,
            to,
            subject,
            html,
            // Add headers for better deliverability
            headers: {
                'X-Priority': '3',
                'X-MSMail-Priority': 'Normal',
                'Importance': 'normal'
            }
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to: ${to}`);
        console.log(`Message ID: ${result.messageId}`);
        return result;
    } catch (err) {
        console.error('Failed to send email: ', err.message);
        
        // Provide more specific error messages
        let errorMessage = 'Email sending failed';
        if (err.code === 'EAUTH') {
            errorMessage = 'SMTP authentication failed. Please check your email credentials.';
        } else if (err.code === 'ECONNECTION') {
            errorMessage = 'SMTP connection failed. Please check your SMTP settings.';
        } else if (err.code === 'ETIMEDOUT') {
            errorMessage = 'SMTP connection timed out. Please try again.';
        } else {
            errorMessage = `Email sending failed: ${err.message}`;
        }
        
        throw new Error(errorMessage);
    }
}

module.exports = { sendMail };