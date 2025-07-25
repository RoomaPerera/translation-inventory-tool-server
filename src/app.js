require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Scheduler = require('./utils/scheduler');

// Import models to register schemas
require('./models/User');
require('./models/UserActivity');
require('./models/Anomaly');

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
app.use(cookieParser());
app.use(logger); //  log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
app.use('/api/activitylogs', require('./routes/activityLogRoutes'));


// Simple test endpoint to verify API is working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', requireAuth,userRoutes);
app.use('/api/projects', requireAuth,projectRoutes);
app.use('/api/languages', requireAuth,languageRoutes);
app.use('/api/admin', requireAuth,adminRoutes);  
app.use('/api/developer', requireAuth,developerRoutes);   
app.use('/api/translations', requireAuth,translationRoutes); 
app.use('/api/translations', requireAuth, revisionRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});app.use('/api/activitylogs', require('./routes/activityLogRoutes'));

app.use('/api/anomalies', require('./routes/anomalies'));

// Start anomaly detection
Scheduler.start();

module.exports = app; 