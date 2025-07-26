const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');



const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const languageRoutes = require('./routes/languageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const developerRoutes = require('./routes/developerRoutes');
const translationRoutes = require('./routes/translationRoutes');
const revisionRoutes = require('./routes/revisionRoutes');
const translationValidationRoutes = require('./routes/translationValidationRoutes');

const requireAuth = require('./middleware/requireAuth');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(logger);

app.use('/api/activitylogs', require('./routes/activityLogRoutes'));

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
app.use('/api/projects', requireAuth, projectRoutes);
app.use('/api/languages', requireAuth, languageRoutes);
app.use('/api/admin', requireAuth, adminRoutes);
app.use('/api/developer', requireAuth, developerRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/translations/revisions', requireAuth, revisionRoutes);
app.use('/api/tools',  translationValidationRoutes);

// Global error handler
app.use(errorHandler);


module.exports = app;
