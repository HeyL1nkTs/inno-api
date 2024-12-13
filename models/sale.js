const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    day:{
        type: String,
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
    mostSoldProd: {
        element: { type: Object, required: true },
        isCombo: { type: Boolean, required: true },
        isProduct: { type: Boolean, required: true },
    }
}, { versionKey: false, timestamps: true });

const Sale = mongoose.model('Sale', SaleSchema);

module.exports = Sale;
