require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { port } = require('./config');

const auth = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const languageRoutes = require('./routes/languageRoutes');
const adminRoutes    = require('./routes/adminRoutes'); 
const developerRoutes = require('./routes/developerRoutes'); 

// Express app
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Connect to DB and start server
connectDB()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`⚡ Server running on port ${port}`);
      console.log(`🔗 API available at http://localhost:${port}/api`);
      console.log(`🧪 Test endpoint at http://localhost:${port}/api/test`);
    });
    
    // Graceful shutdown handlers
    process.once('SIGUSR2', () => {
      server.close(() => process.kill(process.pid, 'SIGUSR2'));
    });
    
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      server.close(() => {
        console.log('Server closed. Disconnecting from MongoDB...');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

// Log MongoDB connection info
console.log('Connecting to MongoDB...');
if (process.env.MONGO_URI) {
  const sanitizedURI = process.env.MONGO_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://$2:****@');
  console.log('MongoDB URI:', sanitizedURI);
} else {
  console.error('❌ MONGO_URI is not defined in .env');
  process.exit(1);
}

if (!process.env.SECRET) {
  console.error("❌ SECRET is not defined in .env");
  process.exit(1);
}