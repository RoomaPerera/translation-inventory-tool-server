const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
    adminID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['Approved', 'Rejected', 'DeletedUser', 'ModifiedLanguages'],
        required: true
    },
    timeStamp: {
        type: Date,
        default: Date.now()
    }
})

module.exports = mongoose.model('adminAudit', auditSchema);