const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

//express app
const app = express();

const logger = require('./middleware/logger');

//middleware
app.use(cors());
app.use(express.json());
app.use(logger); //  log all requests
app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
});

//routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/activitylogs', require('./routes/activityLogRoutes'));


module.exports = app;