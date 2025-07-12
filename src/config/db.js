const mongoose = require('mongoose');
const { mongoURI } = require('./config');

async function connectDB() {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    const connection = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB connected: ${connection.connection.host}`);
    
    // Add connection event listeners
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    return connection;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    // More descriptive error message
    if (err.name === 'MongoNetworkError') {
      console.error('Network error: Check that MongoDB is running and accessible');
    } else if (err.name === 'MongoParseError') {
      console.error('URI parsing error: Check your MongoDB connection string');
    }
    throw err;
  }
}

module.exports = connectDB;