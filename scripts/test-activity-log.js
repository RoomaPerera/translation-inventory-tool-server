// scripts/test-activity-log.js
require('dotenv').config();
const mongoose = require('mongoose');
const ActivityLog = require('../src/models/ActivityLog');

async function testActivityLog() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create a test log entry
    console.log('Creating test ActivityLog entry...');
    const testLog = new ActivityLog({
      userId: new mongoose.Types.ObjectId(), // Generate a random ObjectId
      userName: 'Test User',
      role: 'admin',
      description: 'Test activity log entry'
    });

    // Save the test log
    const savedLog = await testLog.save();
    console.log('Test log saved successfully:');
    console.log(JSON.stringify(savedLog, null, 2));

    // Check if we can find it
    console.log('Verifying by retrieving the log...');
    const foundLog = await ActivityLog.findById(savedLog._id);
    console.log('Found log:');
    console.log(JSON.stringify(foundLog, null, 2));

    // Check total count of logs
    const totalCount = await ActivityLog.countDocuments();
    console.log(`Total logs in collection: ${totalCount}`);

    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

testActivityLog();
