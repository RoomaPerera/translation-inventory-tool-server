const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email
 * @param {string|string[]} to - Single email or array of emails
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @returns {Promise<Object>} - Returns email info or throws error
 */
async function sendEmail(to, subject, text) {
  try {
    // Verify transporter configuration
    await transporter.verify();
    console.log('Email transporter verified');

    const info = await transporter.sendMail({
      from: `"Localization System" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
    });

    console.log(`Email sent successfully: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error; // Re-throw so calling code can handle it
  }
}

module.exports = sendEmail;