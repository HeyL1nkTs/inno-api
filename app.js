const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { initializeSocket } = require('./service/socket.service');
const io = initializeSocket(http);
app.io = io;
require('dotenv').config();
const cors = require('cors');
const PORT = process.env.SERVICE_PORT || 3030;
const db = require('./database/connection');
const seed = require('./database/user.seed');

try {
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

        io.on('connection', (socket) => {
            console.log('A client connected:', socket.id);

            socket.on('disconnect', () => {
                console.log('A client disconnected:', socket.id);
            });
        });

        // Iniciar servidor
        http.listen(PORT, () => {
            console.log(`Servidor escuchando en http://localhost:${PORT}`);
        });
    };

    startApp();
} catch (error) {
    console.error('Error en la aplicación:', error);
    process.exit(1);
}