// models/Supply.js
const mongoose = require('mongoose');

// Define el esquema de Supply
const supplySchema = new mongoose.Schema({
    name: { type: String, required: false },
    price: { type: Number, required: false },
    stock: { type: Number, required: false },
    image_url: { type: String, required: false },
    haveStock: { type: Boolean, default: false },
}, { versionKey: false, timestamps: true });

// Crea el modelo Supply basado en el esquema
const Supply = mongoose.model('Supply', supplySchema);

module.exports = Supply;

