const { sendMail } = require('./mailer');
const User = require('../models/User');

// 1. Notify translators for a new project
async function notifyNewProject(project) {
  const translators = await User.find({
    role: 'Translator',
    languages: { $in: project.languages }
  });
  for (const translator of translators) {
    await sendMail({
      to: translator.email,
      subject: 'New Project Assigned',
      html: `<p>A new project "${project.name}" has been created for your language(s): ${project.languages.join(', ')}</p>`
    });
  }
}

// 2. Notify translators for a new language
async function notifyNewLanguage(language) {
  const translators = await User.find({
    role: 'Translator',
    languages: language.code // or language.name, depending on your schema
  });
  for (const translator of translators) {
    await sendMail({
      to: translator.email,
      subject: 'New Language Added',
      html: `<p>The language "${language.name}" is now available in the system.</p>`
    });
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
  const translators = await User.find({
    role: 'Translator',
    languages: translation.language
  });
  for (const translator of translators) {
    await sendMail({
      to: translator.email,
      subject: 'New Translation Added',
      html: `<p>A new translation for ${translation.language} has been added: <br>${translation.text}</p>`
    });
  }
}

module.exports = {
  notifyNewProject,
  notifyNewLanguage,
  notifyLanguageAssignment,
  notifyNewTranslation,
}; 