require('dotenv').config(); 
const express = require('express');   // loading .env

module.exports = {
    port: process.env.PORT || 5000,
    mongoURI: process.env.MONGO_URI,
};