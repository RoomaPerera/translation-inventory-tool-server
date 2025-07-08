const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

//express app
const app = express();

//middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
});

//routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);


module.exports = app;