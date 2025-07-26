const express = require('express');
const router = express.Router();
const {
  addProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  assignLanguagesToProject,
  getProjectLanguages,
  setProjectDefaultLanguage,
  getProjectDefaultLanguage,
  removeProjectDefaultLanguage
} = require('../controllers/projectController');

const requireAuth = require('../middleware/requireAuth');
// Middleware
router.use(requireAuth);

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

// GET: Get languages for a project
router.get('/:id/languages', getProjectLanguages);

// POST: Assign languages to project
router.post('/:id/languages', assignLanguagesToProject);

// GET: Get default language for a project
router.get('/:id/default-language', getProjectDefaultLanguage);

// PUT: Set default language for a project  
router.put('/:id/default-language', setProjectDefaultLanguage);

// DELETE: Remove default language from a project
router.delete('/:id/default-language', removeProjectDefaultLanguage);

module.exports = router;