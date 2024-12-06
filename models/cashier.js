const mongoose = require('mongoose');

const cashierSchema = new mongoose.Schema({
    status: { type: String, required: false },
    initial_amount: { type: Number, required: false }
}, { versionKey: false, timestamps: true });

// Crea el modelo Supply basado en el esquema
const Cashier = mongoose.model('Cashier', cashierSchema);

module.exports = Cashier;