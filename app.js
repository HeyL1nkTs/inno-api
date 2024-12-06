const express = require('express');
const http = require('http');
const app = express();
require('dotenv').config();
const cors = require('cors');
const PORT = process.env.SERVICE_PORT || 3030;
const db = require('./database/connection');
const seed = require('./database/user.seed');
const { initializeSocket } = require('./service/socket.service');

if (!db()) {
    console.error('Fallo en la conexión a MongoDB, cerrando servidor.');
    process.exit(1);
}


const startApp = async () => {
    await seed();

    app.use(cors({
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }))

    app.get('/', (req, res) => {
        res.send('¡Hola, Express!');
    });

    app.use('/catalog', require('./routes/catalog'));
    app.use('/auth', require('./routes/user'));
    app.use('/cashier', require('./routes/cashier'));
    app.use('/sale', require('./routes/sale'));

    // Crear servidor HTTP
    const server = http.createServer(app);

    // Inicializar Socket.IO
    initializeSocket(server);

    // Iniciar servidor
    server.listen(PORT, () => {
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
};

startApp();