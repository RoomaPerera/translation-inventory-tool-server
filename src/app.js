require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorMiddleware');
const requireAuth = require('./middleware/requireAuth');
const logger = require('./middleware/logger');
const Scheduler = require('./utils/scheduler');
const mongoose = require('mongoose');
const morgan = require('morgan');
// Import models to register schemas
require('./models/User');
require('./models/UserActivity');
require('./models/Anomaly');

// --- Import All Route Handlers ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const languageRoutes = require('./routes/languageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const developerRoutes = require('./routes/developerRoutes');
const translationRoutes = require('./routes/translationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const fuzzyRoutes = require('./routes/fuzzyRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const anomalyRoutes = require('./routes/anomalies');
const nlpRoutes = require('./routes/nlpRoutes');
const translationValidationRoutes = require('./routes/translationValidationRoutes');
// const debugRoutes = require('./routes/debugRoutes');

// Express app initialization



// Express app initialization
const app = express();

// --- Middleware Setup ---
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Cookie',
        'Set-Cookie',
        'X-Requested-With'
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200
}));

app.options('*', cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(logger);

// Route removed from here to avoid duplication

app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// Use routes with authentication where required
app.use('/api/auth', authRoutes);
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/translations', requireAuth, translationRoutes);
app.use('/api/nlp', requireAuth, nlpRoutes);
app.use('/api/projects', requireAuth, projectRoutes);
app.use('/api/languages', requireAuth, languageRoutes);
app.use('/api/admin', requireAuth, adminRoutes);
app.use('/api/developer', requireAuth, developerRoutes);
app.use('/api/activitylogs', requireAuth, activityLogRoutes);
app.use('/api/anomalies', requireAuth, anomalyRoutes);
app.use('/api/fuzzy-search', requireAuth, fuzzyRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/tools', translationValidationRoutes);
// app.use('/api/debug', debugRoutes);

// Start anomaly detection scheduler
Scheduler.start();

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;

