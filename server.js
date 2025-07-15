require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const { port, mongoURI, jwtSecret } = require('./src/config/config'); 
const app = require('./src/app');

// Connect to DB and start server
connectDB()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`⚡ Server running on port ${port}`);
      console.log(`🔗 API available at http://localhost:${port}/api`);
      console.log(`🧪 Test endpoint at http://localhost:${port}/api/test`);
    });
    
    // Graceful shutdown handlers
    process.once('SIGUSR2', () => {
      server.close(() => process.kill(process.pid, 'SIGUSR2'));
    });
    
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      server.close(() => {
        console.log('Server closed. Disconnecting from MongoDB...');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

// Log MongoDB connection info
console.log('Connecting to MongoDB...');
if (mongoURI) { 
  const sanitizedURI = mongoURI.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://$2:****@');
  console.log('MongoDB URI:', sanitizedURI);
} else {
  console.error('❌ MONGO_URI is not defined in .env');
  process.exit(1);
}

if (!jwtSecret) {
 console.error("❌ JWT_SECRET is not defined in .env");
  process.exit(1);
}