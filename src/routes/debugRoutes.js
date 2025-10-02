const express = require('express');const express = require('express');// routes/debugRoutes.js

const router = express.Router();

const router = express.Router();const express = require('express');

// Debug endpoint for testing

router.get('/test', (req, res) => {const router = express.Router();

  res.json({

    success: true,// Debug endpoint for testingconst ActivityLog = require('../models/ActivityLog');

    message: 'Debug route is working',

    timestamp: new Date().toISOString()router.get('/test', (req, res) => {const mongoose = require('mongoose');

  });

});  res.json({



module.exports = router;    success: true,// Debug endpoint to check ActivityLog collection

    message: 'Debug route is working',router.get('/check-logs', async (req, res) => {

    timestamp: new Date().toISOString()    try {

  });        // Check if the collection exists

});        const collections = await mongoose.connection.db.listCollections().toArray();

        const collectionNames = collections.map(c => c.name);

module.exports = router;        const hasActivityLogCollection = collectionNames.includes('activitylogs');
        
        // Get total count of logs
        const totalLogs = await ActivityLog.countDocuments({});
        
        // Get a sample of logs (last 5)
        const recentLogs = await ActivityLog.find().sort({ timeStamp: -1 }).limit(5);
        
        // Get all model names
        const models = Object.keys(mongoose.models);
        
        res.status(200).json({
            success: true,
            mongooseModels: models,
            collectionsInDb: collectionNames,
            activityLogCollectionExists: hasActivityLogCollection,
            totalLogs,
            recentLogs
        });
    } catch (error) {
        console.error('Debug route error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;
