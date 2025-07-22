const express = require('express');
const router = express.Router();
const {
  addProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  assignLanguagesToProject
} = require('../controllers/projectController');

// POST: Add new project
router.post('/', addProject);

// GET: Get all projects
router.get('/', getAllProjects);

// GET: Get project by ID
router.get('/:id', getProjectById);

// PUT: Update a project
router.put('/:id', updateProject);

// DELETE: Delete a project
router.delete('/:id', deleteProject);

// POST: Assign languages to project
router.post('/:id/languages', assignLanguagesToProject);

module.exports = router;
