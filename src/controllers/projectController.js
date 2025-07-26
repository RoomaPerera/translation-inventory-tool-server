const Project = require('../models/Project');
const { notifyNewProject } = require('../utils/notificationService');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Language = require('../models/Language');
const mongoose = require('mongoose');

// REQ-16: Add New Project
const addProject = async (req, res) => {
  try {
    const { name, description, languages, createdBy, defaultLanguage } = req.body;

    // Check for duplicate project name
    const existingProject = await Project.findOne({ name: name.trim() });
    if (existingProject) {
      return res.status(409).json({ message: 'A project with this name already exists.' });
    }

    // Flatten languages array if needed and ensure it's an array of strings
    let flattenedLanguages = [];
    if (languages) {
      flattenedLanguages = Array.isArray(languages) && languages.some(Array.isArray)
        ? languages.flat()
        : (Array.isArray(languages) ? languages : [languages]);
      
      // Ensure all languages are strings (codes/names)
      flattenedLanguages = flattenedLanguages.map(lang => String(lang));
    }

    // Validate default language if provided
    let validatedDefaultLanguage = null;
    if (defaultLanguage) {
      const defaultLangExists = await Language.findOne({
        $or: [
          { '_id': mongoose.Types.ObjectId.isValid(defaultLanguage) ? defaultLanguage : null },
          { 'code': defaultLanguage },
          { 'name': defaultLanguage }
        ]
      });
      
      if (!defaultLangExists) {
        return res.status(400).json({ 
          message: 'Invalid default language specified. Language not found.' 
        });
      }
      
      validatedDefaultLanguage = defaultLangExists._id;
      
      // Ensure default language code is included in the languages array
      if (flattenedLanguages && !flattenedLanguages.includes(defaultLangExists.code) && 
          !flattenedLanguages.includes(defaultLangExists.name)) {
        flattenedLanguages.push(defaultLangExists.code);
      }
    }

    const newProject = new Project({
      name,
      description,
      languages: flattenedLanguages,
      createdBy,
      defaultLanguage: validatedDefaultLanguage,
    });

    await newProject.save();
    
    // Send notification to relevant translators (non-blocking)
    let notificationStatus = 'success';
    try {
      await notifyNewProject(newProject);
    } catch (notificationError) {
      console.error('Failed to send project notification emails:', notificationError);
      notificationStatus = 'email_failed';
    }
    
    //Activity Log: User creates project
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (userId && userRole) {
        const user = await User.findById(userId).select('userName');
        if (user) {
          await ActivityLog.create({
            userId,
            userName: user.userName,
            role: userRole.toLowerCase(),
            description: `Created a new project: ${name}`
          });
        }
      }
    } catch (logErr) {
      console.error('ActivityLog error (addProject):', logErr);
    }

    // Return success response even if email notification failed
    const response = { 
      message: 'Project added successfully.', 
      project: newProject,
      notificationStatus 
    };
    
    if (notificationStatus === 'email_failed') {
      response.warning = 'Project created successfully, but email notifications could not be sent.';
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating project:', error);
    
    // Provide more specific error messages
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A project with this name already exists.',
        error: 'Duplicate project name'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid project data provided.',
        error: error.message
      });
    }
    
    res.status(500).json({
      message: 'Error creating project',
      error: error.message || error,
    });
  }
};

// Get all projects
const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('createdBy', 'name email')
      .populate('defaultLanguage', 'name code nativeName');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error });
  }
};

// Get a single project by ID
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('defaultLanguage', 'name code nativeName');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project', error });
  }
};

// Update a project
const updateProject = async (req, res) => {
  try {
    const { defaultLanguage, ...updateData } = req.body;
    
    // Validate default language if provided
    if (defaultLanguage !== undefined) {
      if (defaultLanguage === null || defaultLanguage === '') {
        // Allow clearing the default language
        updateData.defaultLanguage = null;
      } else {
        const defaultLangExists = await Language.findOne({
          $or: [
            { '_id': mongoose.Types.ObjectId.isValid(defaultLanguage) ? defaultLanguage : null },
            { 'code': defaultLanguage },
            { 'name': defaultLanguage }
          ]
        });
        
        if (!defaultLangExists) {
          return res.status(400).json({ 
            message: 'Invalid default language specified. Language not found.' 
          });
        }
        
        updateData.defaultLanguage = defaultLangExists._id;
      }
    }
    
    const updated = await Project.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('createdBy', 'name email')
      .populate('defaultLanguage', 'name code nativeName');
    if (!updated) return res.status(404).json({ message: 'Project not found' });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a project
const deleteProject = async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Project not found' });
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign new languages to a project
const assignLanguagesToProject = async (req, res) => {
  try {
    const { languages } = req.body;
    if (!Array.isArray(languages)) {
      return res.status(400).json({ message: 'Languages must be an array' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Convert all languages to strings and avoid duplicates
    const stringLanguages = languages.map(lang => String(lang));
    const currentLanguages = project.languages || [];
    
    // Merge and remove duplicates
    project.languages = [...new Set([...currentLanguages, ...stringLanguages])];
    await project.save();

    // Return project with populated default language
    const updatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('defaultLanguage', 'name code nativeName');

    res.status(200).json(updatedProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get languages for a specific project
const getProjectLanguages = async (req, res) => {
  try {
    console.log('Backend: Getting languages for project ID:', req.params.id);
    const project = await Project.findById(req.params.id).populate('defaultLanguage', 'name code nativeName');
    if (!project) {
      console.log('Backend: Project not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('Backend: Found project:', project.name);
    console.log('Backend: Project languages (raw):', project.languages);
    console.log('Backend: Default language:', project.defaultLanguage);

    // If no languages assigned, return empty array
    if (!project.languages || project.languages.length === 0) {
      console.log('Backend: No languages assigned to this project');
      return res.status(200).json({
        projectId: project._id,
        projectName: project.name,
        languages: [],
        defaultLanguage: project.defaultLanguage
      });
    }

    // Since languages are stored as strings (codes/names), find matching Language documents
    let languageObjects = [];
    
    console.log('Backend: Languages are strings, searching by code and name');
    languageObjects = await Language.find({
      $or: [
        { 'code': { $in: project.languages } },
        { 'name': { $in: project.languages } }
      ]
    });

    console.log('Backend: Found language objects:', languageObjects);

    const response = {
      projectId: project._id,
      projectName: project.name,
      languages: languageObjects,
      defaultLanguage: project.defaultLanguage
    };

    console.log('Backend: Sending response:', response);
    res.status(200).json(response);
  } catch (err) {
    console.error('Backend Error fetching project languages:', err);
    res.status(500).json({ error: err.message });
  }
};

// Set default language for a project
const setProjectDefaultLanguage = async (req, res) => {
  try {
    const { languageId } = req.body;
    
    if (!languageId) {
      return res.status(400).json({ message: 'Language ID is required' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Validate that the language exists
    const language = await Language.findOne({
      $or: [
        { '_id': mongoose.Types.ObjectId.isValid(languageId) ? languageId : null },
        { 'code': languageId },
        { 'name': languageId }
      ]
    });

    if (!language) {
      return res.status(404).json({ message: 'Language not found' });
    }

    // Check if the language is part of the project's languages (by code or name)
    const languageInProject = project.languages.includes(language.code) || 
                             project.languages.includes(language.name);

    if (!languageInProject) {
      return res.status(400).json({ 
        message: 'Language must be assigned to the project before setting as default' 
      });
    }

    // Set the default language
    project.defaultLanguage = language._id;
    await project.save();

    // Return updated project with populated default language
    const updatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('defaultLanguage', 'name code nativeName');

    res.status(200).json({
      message: 'Default language set successfully',
      project: updatedProject
    });
  } catch (err) {
    console.error('Error setting default language:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get default language for a project
const getProjectDefaultLanguage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('defaultLanguage', 'name code nativeName');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json({
      projectId: project._id,
      projectName: project.name,
      defaultLanguage: project.defaultLanguage
    });
  } catch (err) {
    console.error('Error fetching default language:', err);
    res.status(500).json({ error: err.message });
  }
};

// Remove default language from a project
const removeProjectDefaultLanguage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.defaultLanguage = null;
    await project.save();

    res.status(200).json({
      message: 'Default language removed successfully',
      project: project
    });
  } catch (err) {
    console.error('Error removing default language:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  assignLanguagesToProject,
  getProjectLanguages,
  setProjectDefaultLanguage,
  getProjectDefaultLanguage,
  removeProjectDefaultLanguage,
};