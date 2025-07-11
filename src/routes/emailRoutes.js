const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const path = require('path');


router.post('/translations', emailController.sendEmail);

module.exports = router;

