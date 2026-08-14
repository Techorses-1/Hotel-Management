const mongoose = require('mongoose');

const globalCounterSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    count: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

const GlobalCounter = mongoose.model('GlobalCounter', globalCounterSchema);
module.exports = GlobalCounter;