const express = require('express');
const cors = require('cors');

const auth = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const languageRoutes = require('./routes/languageRoutes');
const adminRoutes    = require('./routes/adminRoutes'); 
const developerRoutes = require('./routes/developerRoutes'); 
const translationRoutes = require('./routes/translationRoutes');

//express app
const app = express();

// Middleware
// More permissive CORS settings for development
app.use(cors({
  origin: '*',  // Allow all origins during development - more permissive for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json());
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
app.use('/api/auth', auth);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/admin', adminRoutes);  
app.use('/api/developer', developerRoutes);   
app.use('/api/translations', translationRoutes); 

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;