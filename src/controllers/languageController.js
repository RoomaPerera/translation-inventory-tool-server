const Language = require('../models/Language');
const User = require('../models/User');
const mongoose = require('mongoose');

// REQ-17: Add New Language
const addLanguage = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Both language name and code are required' });
    }

    // Check for duplicate language name or code
    const existingLanguage = await Language.findOne({
      $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
    });

    if (existingLanguage) {
      return res.status(409).json({ message: 'Language with this name or code already exists.' });
    }

    const newLanguage = new Language({
      name: name.trim(),
      code: code.trim().toUpperCase()
    });

    await newLanguage.save();
    res.status(201).json({ message: 'Language added successfully.', language: newLanguage });

  } catch (error) {
    console.error(' Error adding language:', error);
    res.status(500).json({
      message: 'Error adding language',
      error: error.message || error,
    });
  }
};

// Fetch all languages
const getAllLanguages = async (req, res) => {
  try {
    const languages = await Language.find();
    res.status(200).json(languages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching languages', error: err.message });
  }
};



// Update language by ID
const updateLanguage = async (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;

  try {
   // Find the existing language to get the old code
   const existingLanguage = await Language.findById(id);
   if (!existingLanguage) {
     return res.status(404).json({ message: 'Language not found' });
   }

   const oldCode = existingLanguage.code;

       // Update the language in the Language collection
       const updatedLanguage = await Language.findByIdAndUpdate(
        id,
        { name, code },
        { new: true }
      );

    // If the code has changed, update all users who had the old code
    if (oldCode !== code) {
      await User.updateMany(
        { languages: oldCode },
        {
          $set: {
            "languages.$[elem]": code
          }
        },
        {
          arrayFilters: [{ "elem": oldCode }]
        }
      );
    }
    
    res.status(200).json({ message: `Language with id ${id} updated successfully!`, updatedLanguage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update language', error: error.message });
  }
};

// Delete language
const deleteLanguage = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedLanguage = await Language.findByIdAndDelete(id);
    if (!deletedLanguage) {
      return res.status(404).json({ message: 'Language not found' });
    }
    res.status(200).json({ message: `Language with id ${id} with deleted successfully!`, deletedLanguage });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting language', error: err.message });
  }
};


module.exports = {
  addLanguage,
  getAllLanguages,
  updateLanguage,
  deleteLanguage
};