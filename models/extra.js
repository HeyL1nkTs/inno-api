const mongoose = require('mongoose');

const extraSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    products: { type: Array, required: true }
}, { versionKey: false, timestamps: true });

const Extra = mongoose.model('Extra', extraSchema);

module.exports = Extra;