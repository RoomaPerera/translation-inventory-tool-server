require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const languageRoutes = require('./routes/languageRoutes');
const adminRoutes    = require('./routes/adminRoutes'); 
const developerRoutes = require('./routes/developerRoutes'); 
const translationRoutes = require('./routes/translationRoutes');
const revisionRoutes = require('./routes/revisionRoutes');
const cookieParser = require('cookie-parser');
const requireAuth = require('./middleware/requireAuth');
const fuzzyRoutes = require('./routes/fuzzyRoutes');

//express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notification');

// Enable CORS BEFORE routes
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Parse JSON
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', requireAuth,userRoutes);
app.use('/api/projects', requireAuth,projectRoutes);
app.use('/api/languages', requireAuth,languageRoutes);
app.use('/api/admin', requireAuth,adminRoutes);  
app.use('/api/developer', requireAuth,developerRoutes);   
app.use('/api/translations', requireAuth,translationRoutes); 
app.use('/api/translations', requireAuth, revisionRoutes);
app.use('/api', fuzzyRoutes); 

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});app.use('/api/activitylogs', require('./routes/activityLogRoutes'));



module.exports = app; 