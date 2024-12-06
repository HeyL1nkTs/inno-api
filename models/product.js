const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: false },
    price: { type: Number, required: false },
    stock: { type: Number, required: false },
    image_url: { type: String, required: false },
    haveStock: { type: Boolean, default: false },
    supplies: { type: Array, required: false }
}, { versionKey: false, timestamps: true });

// Crea el modelo Supply basado en el esquema
const Supply = mongoose.model('Product', productSchema);

module.exports = Supply;