// server.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./src/config/db');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const translationRoutes = require('./src/routes/translationRoutes');
const translationValidationRoutes = require('./src/routes/translationValidationRoutes');

// Import error handler middleware
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/tools', translationValidationRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).send('API is running.');
});

// Error handling middleware (last before server start)
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🔥 Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });

    // Graceful shutdown handlers
    process.once('SIGUSR2', () => {
      server.close(() => process.kill(process.pid, 'SIGUSR2'));
    });

    process.on('SIGINT', () => {
      server.close(() => process.exit(0));
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Optional: log reset secret for debugging (remove in production)
console.log('RESET_SECRET:', process.env.RESET_SECRET);
