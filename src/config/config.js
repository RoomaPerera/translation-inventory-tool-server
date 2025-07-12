require('dotenv').config();    // loading .env

module.exports = {
    port: process.env.PORT || 5000,
    mongoURI: process.env.MONGO_URI,
};