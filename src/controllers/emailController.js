const nodemailer = require('nodemailer');
const Email = require('../models/Email'); 


const sendEmail = async (req, res) => {
  const { text, language } = req.body;

  // Set up Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.USER,
      pass: process.env.APP_PASSWORD,
    },
  });

  //  email content
  const mailOptions = {
    from: {
      name: 'Milinda Hashan',
      address: process.env.USER,
    },
    to: 'milindahashan50@gmail.com',  
    subject: `Add New Translation`,
    text: `Key: ${text} \nLanguage: ${language}`,
  };

  try {
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);

    
    // Save the email details into MongoDB
    const newEmail = new Email({
      to: mailOptions.to,
      subject: mailOptions.subject,
      body: mailOptions.text,
    });

    await newEmail.save();

    res.status(201).json({ message: 'Email sent and saved successfully', data: info.response });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Error sending email', error: error.message });
  }
};

module.exports = { sendEmail };

