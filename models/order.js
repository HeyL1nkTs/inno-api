const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orders: { type: Array, required: true },
    paymentInfo: { type: Object, required: true },
    isConsolidated: { type: Boolean, default: false }
}, { versionKey: false, timestamps: true });

// Crea el modelo Order basado en el esquema
const Order = mongoose.model('Order', orderSchema);
module.exports = Order;