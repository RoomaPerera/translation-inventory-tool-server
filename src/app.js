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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/anomalies', require('./routes/anomalies'));

// Start anomaly detection
Scheduler.start();

module.exports = app; 