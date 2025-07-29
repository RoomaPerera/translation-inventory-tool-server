const { sendMail } = require('./mailer');
const User = require('../models/User');

// 1. Notify translators for a new project
async function notifyNewProject(project) {
  try {
    console.log('notifyNewProject called with:', project);
    
    if (!project || !project.languages || !Array.isArray(project.languages)) {
      console.error('Invalid project data for notification:', project);
      return;
    }

    // Find translators who have any of the project languages
    const translators = await User.find({
      role: 'Translator',
      roleStatus: 'Approved', // Only notify approved translators
      languages: { $in: project.languages }
    });
    
    console.log(`Found ${translators.length} translators for project: ${project.name}`);
    console.log('Project languages:', project.languages);
    console.log('Translators found:', translators.map(t => ({ email: t.email, languages: t.languages })));
    
    if (translators.length === 0) {
      console.log('No translators found for project languages:', project.languages);
      return;
    }
    
    for (const translator of translators) {
      try {
        await sendMail({
          to: translator.email,
          subject: 'New Project Assigned',
          html: `
            <h2>New Project Assignment</h2>
            <p>Hello ${translator.userName || translator.email},</p>
            <p>A new project has been created that matches your language skills:</p>
            <ul>
              <li><strong>Project Name:</strong> ${project.name}</li>
              <li><strong>Languages:</strong> ${project.languages.join(', ')}</li>
              <li><strong>Description:</strong> ${project.description || 'No description provided'}</li>
            </ul>
            <p>Please log in to your dashboard to view the project details.</p>
          `
        });
        console.log(`Notification sent to: ${translator.email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${translator.email}:`, emailError.message);
        // Continue with other translators even if one fails
      }
    }
  } catch (error) {
    console.error('Error in notifyNewProject:', error.message);
    console.error('Full error:', error);
    // Don't throw error - notification failure shouldn't break project creation
  }
}

// 2. Notify translators for a new language
async function notifyNewLanguage(language) {
  try {
    console.log('notifyNewLanguage called with:', language);
    
    if (!language || !language.code) {
      console.error('Invalid language data for notification:', language);
      return;
    }

    // Find translators who might be interested in this language
    const translators = await User.find({
      role: 'Translator',
      roleStatus: 'Approved'
    });
    
    console.log(`Found ${translators.length} approved translators to notify about new language: ${language.name}`);
    
    if (translators.length === 0) {
      console.log('No approved translators found to notify about new language');
      return;
    }
    
    for (const translator of translators) {
      try {
        await sendMail({
          to: translator.email,
          subject: 'New Language Added to System',
          html: `
            <h2>New Language Available</h2>
            <p>Hello ${translator.userName || translator.email},</p>
            <p>A new language has been added to the translation system:</p>
            <ul>
              <li><strong>Language Name:</strong> ${language.name}</li>
              <li><strong>Language Code:</strong> ${language.code}</li>
            </ul>
            <p>If you are proficient in this language, you can request to be assigned to it through your profile settings.</p>
          `
        });
        console.log(`Language notification sent to: ${translator.email}`);
      } catch (emailError) {
        console.error(`Failed to send language email to ${translator.email}:`, emailError.message);
      }
    }
  } catch (error) {
    console.error('Error in notifyNewLanguage:', error.message);
    console.error('Full error:', error);
  }
}

// 3. Notify a translator for a new language assignment
async function notifyLanguageAssignment(translator, language) {
  try {
    console.log('notifyLanguageAssignment called with:', { translator: translator.email, language });
    
    if (!translator || !translator.email || !language) {
      console.error('Invalid data for language assignment notification:', { translator, language });
      return;
    }

    await sendMail({
      to: translator.email,
      subject: 'Language Assignment Updated',
      html: `
        <h2>Language Assignment Update</h2>
        <p>Hello ${translator.userName || translator.email},</p>
        <p>Your language assignments have been updated:</p>
        <ul>
          <li><strong>New Language:</strong> ${language}</li>
        </ul>
        <p>You can now work on translations in this language. Please log in to your dashboard to view available projects.</p>
      `
    });
    console.log(`Language assignment notification sent to: ${translator.email}`);
  } catch (error) {
    console.error(`Failed to send language assignment email to ${translator.email}:`, error.message);
    console.error('Full error:', error);
  }
}

// 4. Notify translators for a new translation
async function notifyNewTranslation(translation) {
  console.log('notifyNewTranslation called with:', translation);
  
  try {
    if (!translation || !translation.language) {
      console.error('Invalid translation data for notification:', translation);
      return;
    }

    // Normalize language to uppercase to match stored translator languages
    const normalizedLanguage = translation.language.trim().toUpperCase();
    
    // Prepare translation text for email
    const translationText = translation.text && translation.text.trim() !== ''
      ? translation.text
      : '<em>No translation yet. Please add one.</em>';
    
    console.log('Looking for translators with language:', normalizedLanguage);
    
    // First, let's check what translators exist
    const allTranslators = await User.find({ role: 'Translator' });
    console.log(`Total translators in system: ${allTranslators.length}`);
    allTranslators.forEach(t => {
      console.log(`   - ${t.userName} (${t.email}) - Status: ${t.roleStatus} - Languages: ${t.languages.join(', ')}`);
    });
    
    // Now find approved translators with the specific language
    const translators = await User.find({
      role: 'Translator',
      roleStatus: 'Approved',
      languages: normalizedLanguage
    });
    
    console.log(`Found ${translators.length} approved translators for language: ${normalizedLanguage}`);
    if (translators.length > 0) {
      translators.forEach(t => {
        console.log(`   - ${t.userName} (${t.email}) - Languages: ${t.languages.join(', ')}`);
      });
    }
    
    if (translators.length === 0) {
      console.log('No approved translators found for language:', normalizedLanguage);
      console.log('Possible reasons:');
      console.log('   - No translators exist in the system');
      console.log('   - No translators are approved');
      console.log('   - No translators have this language assigned');
      console.log('   - Language code mismatch (check case sensitivity)');
      return;
    }
    
    for (const translator of translators) {
      try {
        console.log(`Attempting to send email to: ${translator.email}`);
        await sendMail({
          to: translator.email,
          subject: 'New Translation Key Created',
          html: `
            <h2>New Translation Key Created</h2>
            <p>Hello ${translator.userName || translator.email},</p>
            <p>A new translation key has been created in your assigned language:</p>
            <ul>
              <li><strong>Language:</strong> ${normalizedLanguage}</li>
              <li><strong>Translation Text:</strong> ${translationText}</li>
            </ul>
            <p>Please log in to your dashboard to provide a translation.</p>
          `
        });
        console.log(`Translation notification sent to: ${translator.email}`);
      } catch (emailError) {
        console.error(`Failed to send translation email to ${translator.email}:`, emailError.message);
        console.error('Full error:', emailError);
      }
    }
  } catch (error) {
    console.error('Error in notifyNewTranslation:', error.message);
    console.error('Full error:', error);
  }
}

module.exports = {
    notifyNewProject,
    notifyNewLanguage,
    notifyLanguageAssignment,
    notifyNewTranslation,
}; 