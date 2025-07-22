const express = require('express');
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

//express app
const app = express();

const logger = require('./middleware/logger');

//middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(logger); //  log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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


module.exports = app;