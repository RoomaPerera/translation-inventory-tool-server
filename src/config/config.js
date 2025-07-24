// config/index.js
require('dotenv').config();
const express = require('express');

// Default configuration values
const DEFAULT_PORT = 5000;

// Required environment variables
const requireEnvVariables = [
    'MONGO_URI',
    'JWT_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'FRONTEND_URL'
];

// Validate required environment variables
for (const key of requireEnvVariables) {
    if (!process.env[key]) {
        console.error(`Missing environment variable: ${key}`);
        process.exit(1);
    }
}

// Destructure environment variables
const {
    PORT: portEnv,
    MONGO_URI: mongoURI,
    JWT_SECRET: jwtSecret,
    SMTP_HOST: smtpHost,
    SMTP_PORT: smtpPort,
    SMTP_USER: smtpUser,
    SMTP_PASS: smtpPass,
    FRONTEND_URL: frontendURL,
} = process.env;

// Export configuration object
module.exports = {
    port: Number(portEnv) || DEFAULT_PORT,
    mongoURI,
    jwtSecret,
    smtp: {
        host: smtpHost,
        port: Number(smtpPort),
        user: smtpUser,
        pass: smtpPass
    },
    frontendURL,
    // Additional simple exports
    simpleConfig: {
        port: process.env.PORT || 5000,
        mongoURI: process.env.MONGO_URI,
    }
};