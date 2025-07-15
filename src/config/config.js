// Loads environment variables and exports app configuration
require('dotenv').config();

const DEFAULT_PORT = 5000;

const requireEnvVariables = [
    'MONGO_URI',
    'JWT_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'FRONTEND_URL'
];

for (const key of requireEnvVariables) {
    if (!process.env[key]) {
        console.error(`Missing environment variable: ${key}`);
        process.exit(1);
    }
}

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
};