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
const Scheduler = require('./utils/scheduler');
const logger = require('./middleware/logger');

//express app
const app = express();


// Import models to register schemas
require('./models/User');
require('./models/UserActivity');
require('./models/Anomaly');


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notification');

// Enable CORS BEFORE routes
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(logger); //  log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

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
app.use('/api/activitylogs', require('./routes/activityLogRoutes'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/anomalies', require('./routes/anomalies'));


// Start anomaly detection
Scheduler.start();


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});


module.exports = app; 