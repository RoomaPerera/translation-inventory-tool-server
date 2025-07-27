const Project = require('../models/Project');

const { notifyNewProject } = require('../utils/notificationService');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');


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
    // Send notification to relevant translators
    await notifyNewProject(newProject);
    // --- Activity Log: User creates project ---
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

// Assign languages to a specific project
const assignLanguagesToProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { languages } = req.body;
        
        console.log('Assigning languages to project:', id, 'Languages:', languages);
        
        // Validate project exists
        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Validate languages array
        if (!Array.isArray(languages)) {
            return res.status(400).json({ error: 'Languages must be an array' });
        }

        // Validate that the languages exist in the Language collection
        const Language = require('../models/Language');
        const validLanguages = await Language.find({
            code: { $in: languages }
        });

        if (validLanguages.length !== languages.length) {
            const validCodes = validLanguages.map(lang => lang.code);
            const invalidCodes = languages.filter(code => !validCodes.includes(code));
            return res.status(400).json({ 
                error: `Invalid language codes: ${invalidCodes.join(', ')}` 
            });
        }

        // Update project languages
        project.languages = languages;
        await project.save();

        // Activity Log
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
                        description: `Assigned languages [${languages.join(', ')}] to project: ${project.name}`
                    });
                }
            }
        } catch (logErr) {
            console.error('ActivityLog error (assignLanguagesToProject):', logErr);
        }

        res.status(200).json({ 
            message: 'Languages assigned successfully',
            project: {
                _id: project._id,
                name: project.name,
                languages: project.languages
            }
        });
    } catch (error) {
        console.error('Error assigning languages to project:', error);
        res.status(500).json({ error: error.message });
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