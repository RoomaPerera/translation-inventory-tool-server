require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorMiddleware');
const requireAuth = require('./middleware/requireAuth');
const logger = require('./middleware/logger');
const Scheduler = require('./utils/scheduler');

// Import models to register schemas
require('./models/User');
require('./models/UserActivity');
require('./models/Anomaly');

// --- Import All Route Handlers ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const adminRoutes = require('./routes/adminRoutes');
const developerRoutes = require('./routes/developerRoutes');
const translationRoutes = require('./routes/translationRoutes');
const fuzzyRoutes = require('./routes/fuzzyRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const anomalyRoutes = require('./routes/anomalies');
const languageRoutes = require('./routes/languageRoutes');
const nlpRoutes = require('./routes/nlpRoutes');

// Express app initialization
const app = express();

// --- Middleware Setup ---
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(logger); // Log all requests

// --- API Routes ---
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
app.use('/api', fuzzyRoutes); // public in this setup?

// Start anomaly detection scheduler
Scheduler.start();

// Global Error Handler Middleware (consolidated)
app.use(errorHandler);

module.exports = app;