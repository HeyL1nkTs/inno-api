const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    role: { type: String, required: true }
}, { versionKey: false, timestamps: true });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;