// app.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

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
const translationValidationRoutes = require('./routes/translationValidationRoutes');


//express app
const app = express();

const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
// const { errorMonitor } = require('json2csv/JSON2CSVTransform');

//middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));


app.use(logger); //  log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
app.use('/api/activitylogs', require('./routes/activityLogRoutes'));
app.use(errorHandler);



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
app.use('/api/translations', translationRoutes); 
app.use('/api/translations/revisions', requireAuth, revisionRoutes);
app.use('/api/translations/validation', requireAuth, translationValidationRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;