// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const translationRoutes = require('./routes/translationRoutes');
const translationValidationRoutes = require('./routes/translationValidationRoutes');

// Import custom middleware (error handler)
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*', // You can restrict origins here
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded payloads
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/translation-validation', translationValidationRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('API is running.');
});

// Global error handler (should be last middleware)
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('🔥 MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`🔥 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1); // Exit process on DB connection failure
  });

// Optional: Log RESET_SECRET for debugging (remove in production)
console.log('RESET_SECRET:', process.env.RESET_SECRET);
