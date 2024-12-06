// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conexión a MongoDB exitosa');
        return true;
    } catch (error) {
        console.error('Error al conectar a MongoDB:', error.message);
        return false;
    }
};

module.exports = connectDB;
