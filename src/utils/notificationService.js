const { sendMail } = require('./mailer');
const User = require('../models/User');

// 1. Notify translators for a new project
async function notifyNewProject(project) {
  try {
    const translators = await User.find({
      role: 'Translator',
      languages: { $in: project.languages }
    });
    
    console.log(`Found ${translators.length} translators for project: ${project.name}`);
    
    for (const translator of translators) {
      try {
        await sendMail({
          to: translator.email,
          subject: 'New Project Assigned',
          html: `<p>A new project "${project.name}" has been created for your language(s): ${project.languages.join(', ')}</p>`
        });
        console.log(`Notification sent to: ${translator.email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${translator.email}:`, emailError.message);
        // Continue with other translators even if one fails
      }
    }
  } catch (error) {
    console.error('Error in notifyNewProject:', error.message);
    // Don't throw error - notification failure shouldn't break project creation
  }
}

// 2. Notify translators for a new language
async function notifyNewLanguage(language) {
  try {
    const translators = await User.find({
      role: 'Translator',
      languages: language.code
    });
    
    console.log(`Found ${translators.length} translators for language: ${language.name}`);
    
    for (const translator of translators) {
      try {
        await sendMail({
          to: translator.email,
          subject: 'New Language Added',
          html: `<p>The language "${language.name}" is now available in the system.</p>`
        });
        console.log(`Language notification sent to: ${translator.email}`);
      } catch (emailError) {
        console.error(`Failed to send language email to ${translator.email}:`, emailError.message);
      }
    }
  } catch (error) {
    console.error('Error in notifyNewLanguage:', error.message);
  }
}

// 3. Notify a translator for a new language assignment
async function notifyLanguageAssignment(translator, language) {
  await sendMail({
    to: translator.email,
    subject: 'Language Assignment Updated',
    html: `<p>You have been assigned a new language: ${language}</p>`
  });
}

// 4. Notify translators for a new translation
async function notifyNewTranslation(translation) {
  try {
    const translators = await User.find({
      role: 'Translator',
      languages: translation.language
    });
    
    console.log(`Found ${translators.length} translators for translation in: ${translation.language}`);
    
    for (const translator of translators) {
      try {
        await sendMail({
          to: translator.email,
          subject: 'New Translation Added',
          html: `<p>A new translation for ${translation.language} has been added: <br>${translation.text}</p>`
        });
        console.log(`Translation notification sent to: ${translator.email}`);
      } catch (emailError) {
        console.error(`Failed to send translation email to ${translator.email}:`, emailError.message);
      }
    }
  } catch (error) {
    console.error('Error in notifyNewTranslation:', error.message);
  }
}

module.exports = {
  notifyNewProject,
  notifyNewLanguage,
  notifyLanguageAssignment,
  notifyNewTranslation,
}; 