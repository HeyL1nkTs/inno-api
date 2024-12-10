const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: String, required: false },
    email: { type: String, required: false },
    role: { type: String, required: true }
}, { versionKey: false, timestamps: true });

// Crea el modelo Supply basado en el esquema
const User = mongoose.model('User', userSchema);

module.exports = User;