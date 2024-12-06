const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
    name: { type: String, required: false },
    price: { type: Number, required: false },
    stock: { type: Number, required: false },
    image_url: { type: String, required: false },
    haveStock: { type: Boolean, default: false },
    products: { type: Array, required: false }
}, { versionKey: false, timestamps: true });

// Crea el modelo Supply basado en el esquema
const Combo = mongoose.model('Combo', comboSchema);

module.exports = Combo;