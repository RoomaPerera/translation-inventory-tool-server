const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const requireAuth = require('./middleware/requireAuth');
const errorHandler = require('./middleware/errorMiddleware');

// Import all primary route handlers
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const translationRoutes = require('./routes/translationRoutes'); // The ONLY one needed
const bulkRoutes = require('./routes/bulkOperations');
const nlpRoutes = require('./routes/nlpRoutes');
const languageRoutes = require('./routes/languageRoutes');

// Express app initialization
const app = express();

// Middleware setup
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
});

// === API Routes Mounting ===

// Public routes (no auth required)
app.use('/api/auth', authRoutes);
app.use('/api/languages', languageRoutes);

// Protected routes (requireAuth middleware is applied)
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/translations', requireAuth, translationRoutes); // This now correctly handles ALL translation and revision endpoints
app.use('/api/bulk', requireAuth, bulkRoutes);
app.use('/api/nlp', requireAuth, nlpRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;