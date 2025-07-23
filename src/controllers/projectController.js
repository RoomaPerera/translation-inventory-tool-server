const Project = require('../models/Project');

// REQ-16: Add New Project
const addProject = async (req, res) => {
  try {
    const { name, description, languages, createdBy } = req.body;

    // Check for duplicate project name
    const existingProject = await Project.findOne({ name: name.trim() });
    if (existingProject) {
      return res.status(409).json({ message: 'A project with this name already exists.' });
    }

    // Flatten languages array if needed
    const flattenedLanguages = Array.isArray(languages) && languages.some(Array.isArray)
      ? languages.flat()
      : languages;

    const newProject = new Project({
      name,
      description,
      languages: flattenedLanguages,
      createdBy,
    });

    await newProject.save();
    res.status(201).json({ message: 'Project added successfully.', project: newProject });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      message: 'Error creating project',
      error: error.message || error,
    });
  }
};

// Get all projects
const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().populate('createdBy', 'name email');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error });
  }
};

// Get a single project by ID
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('createdBy', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project', error });
  }
};

// Update a project
const updateProject = async (req, res) => {
  try {
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

    // Avoid duplicates
    project.languages = [...new Set([...project.languages, ...languages])];
    await project.save();

    res.status(200).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get languages for a specific project
const getProjectLanguages = async (req, res) => {
  try {
    console.log('Backend: Getting languages for project ID:', req.params.id);
    const project = await Project.findById(req.params.id);
    if (!project) {
      console.log('Backend: Project not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('Backend: Found project:', project.name);
    console.log('Backend: Project languages (raw):', project.languages);

    // If no languages assigned, return empty array
    if (!project.languages || project.languages.length === 0) {
      console.log('Backend: No languages assigned to this project');
      return res.status(200).json({
        projectId: project._id,
        projectName: project.name,
        languages: []
      });
    }

    // Import Language model to populate language data
    const Language = require('../models/Language');
    
    // Check if the stored values are ObjectIds or language codes/names
    const mongoose = require('mongoose');
    let languageObjects = [];
    
    // Try to determine if we have ObjectIds or language codes
    const firstLanguage = project.languages[0];
    console.log('Backend: First language value:', firstLanguage, 'Type:', typeof firstLanguage);
    
    if (mongoose.Types.ObjectId.isValid(firstLanguage) && firstLanguage.length === 24) {
      // These look like ObjectIds
      console.log('Backend: Languages appear to be ObjectIds, searching by _id');
      languageObjects = await Language.find({
        '_id': { $in: project.languages }
      });
    } else {
      // These are likely language codes or names
      console.log('Backend: Languages appear to be codes/names, searching by code and name');
      languageObjects = await Language.find({
        $or: [
          { 'code': { $in: project.languages } },
          { 'name': { $in: project.languages } }
        ]
      });
    }

    console.log('Backend: Found language objects:', languageObjects);

    const response = {
      projectId: project._id,
      projectName: project.name,
      languages: languageObjects
    };

    console.log('Backend: Sending response:', response);
    res.status(200).json(response);
  } catch (err) {
    console.error('Backend Error fetching project languages:', err);
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
};